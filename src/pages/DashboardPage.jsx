import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { useAuthStore } from '../stores/authStore'
import { useDashboardStore } from '../stores/dashboardStore'
import { getLevelName, getProgressInfo } from '../data/trainerLevels'
import { getTrainerMessage } from '../data/trainerMessages'
import { TRAINERS } from '../data/trainers'
import { extractWeightFromImage } from '../lib/ocr'
import { getAITrainerAdvice } from '../lib/trainerAI'
import { useNotifications } from '../hooks/useNotifications'
import BottomNav from '../components/BottomNav'
import { DashboardSkeleton } from '../components/ui/Skeleton'
import { supabase } from '../lib/supabase'

// 称号 & フレームの定義
const TITLE_PRIORITY = ['title_legend', 'title_iron', 'title_challenger']
const TITLE_META = {
  title_legend:     { emoji: '👑', name: 'レジェンド',     color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  title_iron:       { emoji: '⚙️', name: 'アイアン',       color: 'text-gray-600 bg-gray-100 border-gray-200' },
  title_challenger: { emoji: '🔥', name: 'チャレンジャー', color: 'text-orange-500 bg-orange-50 border-orange-200' },
}

// BMI計算
function calcBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null
  const h = heightCm / 100
  return (weightKg / (h * h)).toFixed(1)
}
function bmiCategory(bmi) {
  const v = parseFloat(bmi)
  if (v < 18.5) return { label: '低体重', color: 'text-blue-500' }
  if (v < 25.0) return { label: '普通体重', color: 'text-green-600' }
  if (v < 30.0) return { label: '肥満(1度)', color: 'text-orange-500' }
  return { label: '肥満(2度以上)', color: 'text-red-500' }
}

// ── ムード ───────────────────────────────────────
const MOOD_MAP = {
  hyped:        { label: '最高調！',   emoji: '🔥' },
  motivated:    { label: 'やる気満々', emoji: '💪' },
  normal:       { label: '普通',       emoji: '😊' },
  concerned:    { label: '少し心配',   emoji: '😐' },
  disappointed: { label: 'がっかり',   emoji: '😞' },
  angry:        { label: '怒り気味',   emoji: '😤' },
}

// ── グラフデータ整形（朝→夜を時系列で1本線）────
function buildChartData(weightRecords) {
  const points = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`
    const recs = weightRecords.filter(r => r.recorded_date === dateStr)
    const morning = recs.find(r => r.time_of_day === 'morning')
    const evening = recs.find(r => r.time_of_day === 'evening')
    // 朝があれば追加、夜があれば追加（記録がなければスキップ）
    if (morning) points.push({ date: `${dateLabel}朝`, 体重: parseFloat(morning.weight_kg) })
    if (evening) points.push({ date: `${dateLabel}夜`, 体重: parseFloat(evening.weight_kg) })
  }
  return points
}

// ── レベルアップモーダル ──────────────────────────
function LevelUpModal({ levelUpData, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="bg-white rounded-3xl shadow-2xl mx-6 p-8 text-center max-w-xs w-full">
        <div className="text-5xl mb-4">🎉</div>
        <p className="text-blue-600 text-xs font-black tracking-widest uppercase mb-3">
          Level Up !
        </p>
        <div className="flex items-center justify-center gap-5 mb-5">
          <div className="text-center opacity-40">
            <div className="text-gray-400 text-[10px] mb-1">BEFORE</div>
            <div className="text-gray-900 text-3xl font-black">Lv.{levelUpData.from}</div>
          </div>
          <div className="text-blue-500 text-xl font-black">→</div>
          <div className="text-center">
            <div className="text-blue-500 text-[10px] mb-1">NOW</div>
            <div className="text-blue-600 text-4xl font-black">Lv.{levelUpData.to}</div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-6 py-3 mb-5">
          <p className="text-blue-700 text-base font-bold">{getLevelName(levelUpData.to)}</p>
        </div>
        <p className="text-gray-400 text-xs">タップして閉じる</p>
      </div>
    </div>
  )
}

// ── 連続記録ボーナスモーダル ──────────────────────
function StreakBonusModal({ streakBonusData, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [onClose])

  const emoji = streakBonusData.days >= 30 ? '🏆' : streakBonusData.days >= 14 ? '🥇' : '🔥'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="bg-white rounded-3xl shadow-2xl mx-6 p-8 text-center max-w-xs w-full">
        <div className="text-5xl mb-4">{emoji}</div>
        <p className="text-orange-500 text-xs font-black tracking-widest uppercase mb-3">
          Streak Bonus !
        </p>
        <p className="text-gray-900 text-2xl font-black mb-2">
          {streakBonusData.days}日連続達成！
        </p>
        <p className="text-gray-500 text-sm mb-5">
          継続は力なり。この調子で頑張ろう！
        </p>
        <div className="bg-orange-50 border border-orange-100 rounded-2xl px-6 py-4 mb-5">
          <p className="text-orange-400 text-xs font-bold mb-1">ボーナスポイント</p>
          <p className="text-orange-600 text-3xl font-black">
            +{streakBonusData.bonus.toLocaleString()}<span className="text-base font-normal ml-1">pt</span>
          </p>
        </div>
        <p className="text-gray-400 text-xs">タップして閉じる</p>
      </div>
    </div>
  )
}

// ── トレーナー変更モーダル ────────────────────────
function TrainerChangeModal({ currentTrainerId, onSelect, onClose }) {
  const [selected, setSelected] = useState(null)

  const handleConfirm = () => {
    if (selected) onSelect(selected)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-sm max-h-[85dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-3xl">
          <div>
            <h2 className="text-gray-900 font-black text-base">トレーナーを変更</h2>
            <p className="text-gray-400 text-xs mt-0.5">過去に使ったトレーナーはステータス引継ぎ</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">✕</button>
        </div>

        {/* トレーナー一覧 */}
        <div className="p-4 grid grid-cols-2 gap-3">
          {TRAINERS.map(t => {
            const isCurrent  = t.id === currentTrainerId
            const isSelected = selected?.id === t.id
            return (
              <button
                key={t.id}
                onClick={() => !isCurrent && setSelected(t)}
                disabled={isCurrent}
                className={`rounded-2xl border-2 p-3 text-left transition-all ${
                  isCurrent
                    ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                    : isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-100 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.gradient} flex items-center justify-center text-xl mb-2`}>
                  {t.emoji}
                </div>
                <p className="text-gray-900 font-black text-sm">{t.name}</p>
                <p className="text-gray-400 text-[10px] mt-0.5">{t.title}</p>
                {isCurrent && <p className="text-blue-500 text-[10px] font-bold mt-1">現在のトレーナー</p>}
                {isSelected && <p className="text-blue-600 text-[10px] font-bold mt-1">✓ 選択中</p>}
              </button>
            )
          })}
        </div>

        {/* 選択中のトレーナー詳細 */}
        {selected && (
          <div className="mx-4 mb-4 bg-gray-50 rounded-2xl p-4">
            <p className="text-gray-500 text-xs leading-relaxed">{selected.description}</p>
            <p className="text-gray-400 text-xs mt-2 italic">「{selected.quote}」</p>
          </div>
        )}

        {/* 確定ボタン */}
        <div className="px-4 pb-8">
          <button
            onClick={handleConfirm}
            disabled={!selected}
            className="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-black text-base disabled:opacity-30 transition-all active:scale-[0.98]"
          >
            {selected ? `${selected.name}に変更する` : 'トレーナーを選んでください'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── アチーブメント解除モーダル ────────────────────
function AchievementUnlockModal({ achievements, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [onClose])

  // 複数ある場合は最初の1件だけ表示
  const ach = achievements[0]
  if (!ach) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="bg-white rounded-3xl shadow-2xl mx-6 p-8 text-center max-w-xs w-full">
        <div className="text-5xl mb-3">{ach.emoji}</div>
        <p className="text-yellow-500 text-xs font-black tracking-widest uppercase mb-2">
          Achievement Unlocked !
        </p>
        <p className="text-gray-900 text-xl font-black mb-1">{ach.title}</p>
        <p className="text-gray-400 text-sm mb-5">{ach.description}</p>
        {achievements.length > 1 && (
          <p className="text-orange-400 text-xs font-bold mb-4">
            他{achievements.length - 1}件も解除されました！
          </p>
        )}
        <p className="text-gray-300 text-xs">タップして閉じる</p>
      </div>
    </div>
  )
}

// ── メインコンポーネント ──────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, profile, signOut, updateProfile } = useAuthStore()
  const {
    trainer, userTrainer,
    weightRecords, todayRecords,
    totalPoints, consecutiveDays,
    loading, submitting,
    levelUpData, streakBonusData, streakFreezeUsed,
    newAchievements,
    fetchDashboard, addWeightRecord, clearLevelUp, clearStreakBonus, changeTrainer,
    clearNewAchievements, checkAchievements,
  } = useDashboardStore()

  // トレーナー変更
  const [trainerModalOpen, setTrainerModalOpen] = useState(false)
  const [changingTrainer, setChangingTrainer] = useState(false)

  const [timeOfDay, setTimeOfDay] = useState('morning')
  const [weightInput, setWeightInput] = useState('')
  const [submitMsg, setSubmitMsg] = useState(null)

  // 目標体重
  const [goalEditing, setGoalEditing] = useState(false)
  const [goalInput, setGoalInput] = useState('')

  // ニックネーム編集
  const [nameEditing, setNameEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')

  // OCR
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState(null)

  // 身長編集
  const [heightEditing, setHeightEditing] = useState(false)
  const [heightInput, setHeightInput] = useState('')

  // 今日のカロリー（食事記録から取得）
  const [todayCalories, setTodayCalories] = useState(null)

  // 称号・フレーム
  const [equippedTitle, setEquippedTitle] = useState(null)
  const [equippedFrame, setEquippedFrame] = useState(null)

  // AIアドバイス
  const [aiAdvice, setAiAdvice] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const aiLoadedRef = useRef(false)

  // 通知
  const hasRecordedToday = !!(todayRecords.morning || todayRecords.evening)
  const { permission, settings: notifSettings, toggleNotifications, saveSettings: saveNotifSettings, isSupported: notifSupported } = useNotifications(hasRecordedToday)
  const [notifOpen, setNotifOpen] = useState(false)

  useEffect(() => {
    if (user?.id) {
      fetchDashboard(user.id, profile)
      fetchTodayCalories()
      fetchEquipped()
    }
  }, [user?.id, fetchDashboard])

  // AIアドバイスはトレーナーとデータが揃ったら1回だけロード
  useEffect(() => {
    if (trainer && !aiLoadedRef.current && !loading) {
      aiLoadedRef.current = true
      loadAIAdvice()
    }
  }, [trainer, loading])

  const fetchTodayCalories = async () => {
    if (!user?.id) return
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('meal_records')
      .select('calories')
      .eq('user_id', user.id)
      .eq('recorded_date', today)
    const total = (data ?? []).reduce((sum, r) => sum + (r.calories ?? 0), 0)
    setTodayCalories(total)
  }

  // 装備中の称号・フレームを取得
  const fetchEquipped = async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('user_purchases')
      .select('item_id')
      .eq('user_id', user.id)
      .is('used_at', null)
    if (!data) return
    const owned = new Set(data.map(r => r.item_id))
    for (const tid of TITLE_PRIORITY) {
      if (owned.has(tid)) { setEquippedTitle(TITLE_META[tid]); break }
    }
    if (owned.has('frame_rainbow'))    setEquippedFrame('rainbow')
    else if (owned.has('frame_gold')) setEquippedFrame('gold')
  }

  // AIアドバイスを生成
  const loadAIAdvice = async () => {
    if (!trainer) return
    setAiLoading(true)
    const sorted = [...weightRecords].sort((a, b) => a.recorded_date.localeCompare(b.recorded_date))
    const weightTrend = sorted.length >= 2
      ? parseFloat((parseFloat(sorted[sorted.length-1].weight_kg) - parseFloat(sorted[0].weight_kg)).toFixed(1))
      : null
    const nickname = profile?.username ?? user?.email?.split('@')[0] ?? 'あなた'
    const bmiVal = calcBMI(
      todayRecords.evening?.weight_kg ?? todayRecords.morning?.weight_kg ?? null,
      profile?.height_cm
    )
    const msg = await getAITrainerAdvice(trainer, {
      nickname,
      weightTrend,
      calories: todayCalories,
      streak: consecutiveDays,
      level: userTrainer?.current_level ?? 1,
      bmi: bmiVal,
    })
    if (msg) setAiAdvice(msg)
    setAiLoading(false)
  }

  useEffect(() => {
    const existing = todayRecords[timeOfDay]
    setWeightInput(existing ? String(existing.weight_kg) : '')
  }, [timeOfDay, todayRecords])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const kg = parseFloat(weightInput)
    if (isNaN(kg) || kg <= 0 || kg >= 500) {
      setSubmitMsg({ type: 'error', text: '正しい体重を入力してください' })
      return
    }
    const isNew = !todayRecords[timeOfDay]
    try {
      await addWeightRecord(user.id, timeOfDay, kg)
      // 記録後にアチーブメントチェック
      if (isNew) await checkAchievements(user.id, profile)
      setSubmitMsg({
        type: 'success',
        text: isNew ? '記録しました！ +50pt +10exp' : '更新しました',
      })
      setTimeout(() => setSubmitMsg(null), 3000)
    } catch {
      setSubmitMsg({ type: 'error', text: '記録に失敗しました' })
    }
  }

  const handleOcrCapture = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setOcrError(null)
    setOcrLoading(true)
    try {
      const kg = await extractWeightFromImage(file)
      if (kg !== null) {
        setWeightInput(String(kg))
        setOcrError(null)
      } else {
        setOcrError('数値を読み取れませんでした。もう一度試してください')
      }
    } catch (err) {
      setOcrError(err.message ?? '読み取りに失敗しました')
    } finally {
      setOcrLoading(false)
      // 同じファイルを再選択できるようにリセット
      e.target.value = ''
    }
  }

  const handleTrainerChange = async (newTrainer) => {
    setTrainerModalOpen(false)
    setChangingTrainer(true)
    await changeTrainer(user.id, newTrainer.id)
    setChangingTrainer(false)
  }

  const handleNameSave = async () => {
    const name = nameInput.trim()
    if (!name) return
    await updateProfile(user.id, { username: name })
    setNameEditing(false)
  }

  const handleHeightSave = async () => {
    const cm = parseFloat(heightInput)
    if (isNaN(cm) || cm < 100 || cm > 250) return
    await updateProfile(user.id, { height_cm: cm })
    setHeightEditing(false)
  }

  const handleGoalSave = async () => {
    const kg = parseFloat(goalInput)
    if (isNaN(kg) || kg < 20 || kg > 300) return
    const updates = { target_weight: kg }
    // 初回設定時: 現在の最新体重を start_weight として保存
    if (!profile?.start_weight) {
      const latest = weightRecords[0]?.weight_kg ?? null
      if (latest) updates.start_weight = parseFloat(latest)
    }
    await updateProfile(user.id, updates)
    setGoalEditing(false)
  }

  if (loading) return <DashboardSkeleton />

  const todayExisting = todayRecords[timeOfDay]
  const latestWeight  = todayRecords.evening?.weight_kg ?? todayRecords.morning?.weight_kg ?? null
  const bmi         = calcBMI(latestWeight, profile?.height_cm)
  const bmiCat      = bmi ? bmiCategory(bmi) : null
  const mood        = MOOD_MAP[userTrainer?.mood] ?? MOOD_MAP.normal
  const level       = userTrainer?.current_level ?? 1
  const netScore    = userTrainer?.net_score ?? 0
  const levelName   = getLevelName(level)
  const isNegative  = level < 0
  const { progress, nextLevelName, pointsNeeded } = getProgressInfo(netScore, level)
  const chartData   = buildChartData(weightRecords)

  const today = new Date()
  const dateLabel = `${today.getMonth() + 1}月${today.getDate()}日（${'日月火水木金土'[today.getDay()]}）`

  return (
    <div className="min-h-dvh bg-gray-50 pb-20">

      {/* レベルアップモーダル */}
      {levelUpData && (
        <LevelUpModal levelUpData={levelUpData} onClose={clearLevelUp} />
      )}

      {/* 連続記録ボーナスモーダル */}
      {streakBonusData && !levelUpData && (
        <StreakBonusModal streakBonusData={streakBonusData} onClose={clearStreakBonus} />
      )}

      {/* アチーブメント解除モーダル */}
      {newAchievements.length > 0 && !levelUpData && !streakBonusData && (
        <AchievementUnlockModal achievements={newAchievements} onClose={clearNewAchievements} />
      )}

      {/* トレーナー変更モーダル */}
      {trainerModalOpen && (
        <TrainerChangeModal
          currentTrainerId={userTrainer?.trainer_id}
          onSelect={handleTrainerChange}
          onClose={() => setTrainerModalOpen(false)}
        />
      )}

      {/* ══ ヘッダー ══ */}
      <div className="bg-white border-b border-gray-100 px-5 pt-14 pb-5">
        <div className="max-w-sm mx-auto flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs mb-0.5">{dateLabel}</p>
            {nameEditing ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setNameEditing(false) }}
                  placeholder="ニックネーム"
                  maxLength={20}
                  className="text-gray-900 text-base font-black bg-gray-100 rounded-lg px-2 py-1 w-32 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button onClick={handleNameSave} className="text-blue-600 text-xs font-bold">保存</button>
                <button onClick={() => setNameEditing(false)} className="text-gray-400 text-xs">✕</button>
              </div>
            ) : (
              <button
                onClick={() => { setNameInput(profile?.username ?? ''); setNameEditing(true) }}
                className="flex items-center gap-1.5 group"
              >
                <h1 className="text-gray-900 text-xl font-black">
                  {profile?.username ?? user?.email?.split('@')[0]}のダイエット
                </h1>
                <span className="text-gray-300 text-xs group-hover:text-gray-400 transition-colors">✏️</span>
              </button>
            )}
            {/* 称号バッジ */}
            {equippedTitle && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${equippedTitle.color}`}>
                {equippedTitle.emoji} {equippedTitle.name}
              </span>
            )}
          </div>
          {/* 今日の体重バッジ */}
          {latestWeight && (
            <div className="text-right">
              <p className="text-gray-400 text-[10px]">今日の体重</p>
              <p className="text-gray-900 text-2xl font-black leading-none">
                {latestWeight}<span className="text-sm font-normal text-gray-400 ml-0.5">kg</span>
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4 pt-4 pb-10 space-y-3">

        {/* ══ トレーナーカード ══ */}
        {trainer && userTrainer && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* カラーライン */}
            <div className={`h-1 bg-gradient-to-r ${trainer.gradient}`} />

            <div className="p-4">
              {/* カードヘッダー：変更ボタン */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-400 text-[10px] font-bold tracking-wider uppercase">My Trainer</p>
                <button
                  onClick={() => setTrainerModalOpen(true)}
                  disabled={changingTrainer}
                  className="text-blue-500 text-xs font-semibold hover:underline disabled:opacity-40"
                >
                  {changingTrainer ? '変更中…' : 'トレーナーを変更'}
                </button>
              </div>

              <div className="flex items-center gap-3">
                {/* アイコン（フレーム対応） */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${trainer.gradient} flex items-center justify-center text-2xl flex-shrink-0 shadow-sm ${
                  equippedFrame === 'rainbow'
                    ? 'ring-2 ring-offset-1 ring-violet-400 shadow-violet-200 shadow-lg'
                    : equippedFrame === 'gold'
                    ? 'ring-2 ring-offset-1 ring-yellow-400 shadow-yellow-200 shadow-lg'
                    : ''
                }`}>
                  {trainer.emoji}
                </div>

                {/* 情報 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-gray-900 font-black text-base">{trainer.name}</span>
                    <span className="text-gray-400 text-xs">{trainer.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      isNegative
                        ? 'bg-red-50 text-red-600 border border-red-100'
                        : 'bg-blue-50 text-blue-600 border border-blue-100'
                    }`}>
                      Lv.{level}
                    </span>
                    <span className="text-gray-600 text-xs font-medium">{levelName}</span>
                  </div>
                </div>

                {/* ムード */}
                <div className="text-center flex-shrink-0">
                  <div className="text-2xl">{mood.emoji}</div>
                  <div className="text-gray-400 text-[10px] mt-0.5">{mood.label}</div>
                </div>
              </div>

              {/* 進捗バー */}
              <div className="mt-3 pt-3 border-t border-gray-50">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-400">SCORE {netScore}</span>
                  {nextLevelName
                    ? <span className="text-gray-400">{nextLevelName} まで <span className="text-blue-600 font-bold">{pointsNeeded}pt</span></span>
                    : <span className="text-blue-600 font-bold">MAX LEVEL 🏆</span>
                  }
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      isNegative
                        ? 'bg-gradient-to-r from-red-400 to-red-500'
                        : 'bg-gradient-to-r from-blue-400 to-blue-600'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* トレーナーの一言（AIアドバイス） */}
              <div className="mt-3 pt-3 border-t border-gray-50">
                <div className="flex gap-2 items-start">
                  <div className={`shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br ${trainer.gradient} flex items-center justify-center text-sm`}>
                    {trainer.emoji}
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-xl rounded-tl-none px-3 py-2 min-h-[36px]">
                    {aiLoading ? (
                      <div className="flex items-center gap-1.5 h-5">
                        <div className="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-300 text-xs">考え中...</p>
                      </div>
                    ) : (
                      <p className="text-gray-700 text-xs leading-relaxed">
                        {aiAdvice ?? getTrainerMessage(trainer.code, userTrainer.mood, consecutiveDays)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ 体重記録カード ══ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-gray-900 font-black text-sm">⚖️ 体重を記録</h2>
            <span className="text-blue-500 text-xs font-bold bg-blue-50 px-2 py-0.5 rounded-full">
              +50pt
            </span>
          </div>

          {/* 朝/夜 タブ */}
          <div className="flex gap-1.5 mb-3 bg-gray-100 rounded-xl p-1">
            {[
              { value: 'morning', label: '☀️ 朝' },
              { value: 'evening', label: '🌙 夜' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTimeOfDay(value)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                  timeOfDay === value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {label}
                {todayRecords[value] && (
                  <span className="ml-1 text-xs font-normal text-gray-400">
                    {todayRecords[value].weight_kg}
                  </span>
                )}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="number"
                step="0.1"
                min="20"
                max="300"
                value={weightInput}
                onChange={e => setWeightInput(e.target.value)}
                placeholder="58.5"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-lg font-black focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent pr-12 placeholder-gray-300"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">kg</span>
            </div>

            {/* カメラ読み取りボタン */}
            <label className={`flex items-center justify-center w-12 rounded-xl border border-gray-200 bg-gray-50 cursor-pointer transition-all hover:bg-gray-100 ${ocrLoading ? 'opacity-50 pointer-events-none' : ''}`}>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleOcrCapture}
                disabled={ocrLoading}
              />
              {ocrLoading ? (
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-xl">📷</span>
              )}
            </label>

            <button
              type="submit"
              disabled={submitting || !weightInput}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 py-3 rounded-xl text-sm font-bold disabled:opacity-40 transition-all active:scale-95 shadow-sm whitespace-nowrap"
            >
              {submitting ? '…' : todayExisting ? '更新' : '記録する'}
            </button>
          </form>

          {ocrError && (
            <p className="mt-2 text-xs text-center text-red-500">{ocrError}</p>
          )}

          {submitMsg && (
            <p className={`mt-2 text-xs text-center font-semibold ${
              submitMsg.type === 'success' ? 'text-blue-600' : 'text-red-500'
            }`}>
              {submitMsg.text}
            </p>
          )}
        </div>

        {/* ══ 週次レポートカード ══ */}
        {(() => {
          const today = new Date()
          const dayOfWeek = today.getDay() // 0=日, 1=月...
          const startOfWeek = new Date(today)
          startOfWeek.setDate(today.getDate() - dayOfWeek)
          startOfWeek.setHours(0, 0, 0, 0)
          const weekStr = startOfWeek.toISOString().split('T')[0]

          const weekRecords = weightRecords.filter(r => r.recorded_date >= weekStr)
          if (weekRecords.length === 0) return null

          const weekDates = new Set(weekRecords.map(r => r.recorded_date))
          const weekWeights = weekRecords.map(r => parseFloat(r.weight_kg))
          const weekAvg = (weekWeights.reduce((a, b) => a + b, 0) / weekWeights.length).toFixed(1)

          // 今週最初と最後の体重で変化量
          const sorted = [...weekRecords].sort((a, b) => a.recorded_date.localeCompare(b.recorded_date) || (a.time_of_day === 'morning' ? -1 : 1))
          const weekFirst = parseFloat(sorted[0].weight_kg)
          const weekLast  = parseFloat(sorted[sorted.length - 1].weight_kg)
          const weekDiff  = parseFloat((weekLast - weekFirst).toFixed(1))

          return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h2 className="text-gray-900 font-black text-sm mb-3">📊 今週のレポート</h2>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <p className="text-gray-400 text-[10px] font-bold mb-1">記録日数</p>
                  <p className="text-gray-900 text-2xl font-black">{weekDates.size}<span className="text-xs text-gray-400 font-normal">日</span></p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-[10px] font-bold mb-1">平均体重</p>
                  <p className="text-blue-600 text-2xl font-black">{weekAvg}<span className="text-xs text-gray-400 font-normal">kg</span></p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-[10px] font-bold mb-1">今週の変化</p>
                  <p className={`text-2xl font-black ${weekDiff < 0 ? 'text-green-600' : weekDiff > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    {weekDiff > 0 ? `+${weekDiff}` : weekDiff}<span className="text-xs text-gray-400 font-normal">kg</span>
                  </p>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ══ 統計カード ══ */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-gray-400 text-[10px] font-bold tracking-wider uppercase mb-1">Streak</p>
            <div className="flex items-baseline gap-1">
              <span className="text-gray-900 text-3xl font-black">{consecutiveDays}</span>
              <span className="text-gray-400 text-sm">日</span>
            </div>
            <p className="text-gray-400 text-xs mt-1">🔥 連続記録</p>
            {/* 次のボーナスまでのヒント */}
            {(() => {
              const next = [7, 14, 30].find(d => d > consecutiveDays)
              return next ? (
                <p className="text-orange-400 text-[10px] mt-1 font-semibold">
                  あと{next - consecutiveDays}日でボーナス🎁
                </p>
              ) : (
                <p className="text-orange-400 text-[10px] mt-1 font-semibold">🏆 30日達成！</p>
              )
            })()}
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-gray-400 text-[10px] font-bold tracking-wider uppercase mb-1">Points</p>
            <div className="flex items-baseline gap-1">
              <span className="text-blue-600 text-3xl font-black">{totalPoints.toLocaleString()}</span>
              <span className="text-gray-400 text-sm">pt</span>
            </div>
            <p className="text-gray-400 text-xs mt-1">⭐ 累計</p>
          </div>
        </div>

        {/* ══ 今日のカロリーカード ══ */}
        {todayCalories !== null && (
          <div
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 cursor-pointer active:bg-gray-50"
            onClick={() => window.location.href = '/meals'}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-[10px] font-bold tracking-wider uppercase mb-1">Today's Calories</p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-3xl font-black ${todayCalories >= 2000 ? 'text-red-500' : 'text-gray-900'}`}>
                    {todayCalories.toLocaleString()}
                  </span>
                  <span className="text-gray-400 text-sm">kcal</span>
                </div>
                <p className="text-gray-400 text-xs mt-1">🍽️ 目標 2,000kcal</p>
              </div>
              <div className="text-right">
                <div className="w-14 h-14 relative">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="#f3f4f6" strokeWidth="4" />
                    <circle
                      cx="24" cy="24" r="20" fill="none"
                      stroke={todayCalories >= 2000 ? '#f87171' : '#3b82f6'}
                      strokeWidth="4"
                      strokeDasharray={`${Math.min(100, Math.round(todayCalories / 2000 * 100)) * 1.257} 125.7`}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-gray-700">
                    {Math.min(100, Math.round(todayCalories / 2000 * 100))}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ BMIカード ══ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-gray-900 font-black text-sm">🧮 BMI</h2>
            <button
              onClick={() => { setHeightInput(profile?.height_cm ? String(profile.height_cm) : ''); setHeightEditing(true) }}
              className="text-blue-500 text-xs font-semibold hover:underline"
            >
              {profile?.height_cm ? '身長を変更' : '身長を設定'}
            </button>
          </div>

          {heightEditing ? (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.1"
                  min="100"
                  max="250"
                  value={heightInput}
                  onChange={e => setHeightInput(e.target.value)}
                  placeholder="170"
                  autoFocus
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-base font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">cm</span>
              </div>
              <button onClick={handleHeightSave} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold">保存</button>
              <button onClick={() => setHeightEditing(false)} className="bg-gray-100 text-gray-500 px-3 py-2.5 rounded-xl text-sm font-bold">✕</button>
            </div>
          ) : profile?.height_cm ? (
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-gray-400 text-[10px]">身長</p>
                <p className="text-gray-700 text-base font-black">{profile.height_cm}<span className="text-xs font-normal text-gray-400 ml-0.5">cm</span></p>
              </div>
              {bmi ? (
                <>
                  <div className="text-center">
                    <p className="text-gray-400 text-[10px]">BMI</p>
                    <p className="text-gray-900 text-3xl font-black">{bmi}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400 text-[10px]">判定</p>
                    <p className={`text-base font-black ${bmiCat.color}`}>{bmiCat.label}</p>
                  </div>
                </>
              ) : (
                <p className="text-gray-400 text-sm">体重を記録するとBMIが表示されます</p>
              )}
            </div>
          ) : (
            <p className="text-gray-300 text-sm text-center py-1">身長を設定するとBMIが計算されます</p>
          )}
        </div>

        {/* ══ 目標体重カード ══ */}
        {(() => {
          const target    = profile?.target_weight ? parseFloat(profile.target_weight) : null
          const startW    = profile?.start_weight  ? parseFloat(profile.start_weight)  : null
          const currentW  = latestWeight            ? parseFloat(latestWeight)          : null
          const remaining = target && currentW ? (currentW - target).toFixed(1) : null
          const goalPct   = (target && startW && currentW && startW !== target)
            ? Math.min(100, Math.max(0, Math.round((startW - currentW) / (startW - target) * 100)))
            : null
          const achieved  = remaining !== null && parseFloat(remaining) <= 0

          return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-gray-900 font-black text-sm">🎯 目標体重</h2>
                <button
                  onClick={() => { setGoalInput(target ? String(target) : ''); setGoalEditing(true) }}
                  className="text-blue-500 text-xs font-semibold hover:underline"
                >
                  {target ? '変更' : '設定する'}
                </button>
              </div>

              {goalEditing ? (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.1"
                      min="20"
                      max="300"
                      value={goalInput}
                      onChange={e => setGoalInput(e.target.value)}
                      placeholder="60.0"
                      autoFocus
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-base font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">kg</span>
                  </div>
                  <button
                    onClick={handleGoalSave}
                    className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold"
                  >保存</button>
                  <button
                    onClick={() => setGoalEditing(false)}
                    className="bg-gray-100 text-gray-500 px-3 py-2.5 rounded-xl text-sm font-bold"
                  >✕</button>
                </div>
              ) : target ? (
                <div className="space-y-2">
                  <div className="flex items-end justify-between">
                    <div>
                      {achieved ? (
                        <p className="text-blue-600 text-lg font-black">🎉 目標達成！</p>
                      ) : (
                        <>
                          <span className="text-gray-400 text-xs">あと</span>
                          <span className="text-gray-900 text-3xl font-black mx-1">{remaining}</span>
                          <span className="text-gray-400 text-sm">kg</span>
                        </>
                      )}
                    </div>
                    <div className="text-right">
                      {currentW && <p className="text-gray-400 text-xs">現在 <span className="text-gray-700 font-bold">{currentW}kg</span></p>}
                      <p className="text-gray-400 text-xs">目標 <span className="text-blue-600 font-bold">{target}kg</span></p>
                    </div>
                  </div>
                  {goalPct !== null && (
                    <>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-700"
                          style={{ width: `${goalPct}%` }}
                        />
                      </div>
                      <p className="text-right text-xs text-blue-500 font-bold">{goalPct}% 達成</p>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-gray-300 text-sm text-center py-2">目標体重を設定して進捗を確認しよう</p>
              )}
            </div>
          )
        })()}

        {/* ══ 体重グラフ ══ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="text-gray-900 font-black text-sm mb-3">📈 体重の推移</h2>
          {weightRecords.length === 0 ? (
            <div className="h-36 flex items-center justify-center">
              <p className="text-gray-300 text-sm text-center leading-relaxed">
                体重を記録すると<br />グラフが表示されます
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip
                  formatter={(v) => v ? [`${v} kg`, '体重'] : ['-', '体重']}
                  contentStyle={{
                    fontSize: 12, borderRadius: 10,
                    background: '#fff', border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
                  }}
                />
                <Line type="monotone" dataKey="体重" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ストリークフリーズ発動通知 */}
        {streakFreezeUsed > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl">🧊</span>
            <div>
              <p className="text-blue-700 font-black text-sm">ストリークフリーズ発動！</p>
              <p className="text-blue-500 text-xs">フリーズ×{streakFreezeUsed}でストリークを守りました</p>
            </div>
          </div>
        )}

        {/* ══ ランキングカード ══ */}
        <div
          className="bg-gradient-to-r from-purple-500 to-blue-600 rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-all shadow-sm"
          onClick={() => navigate('/ranking')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-xs font-bold mb-1">🏆 ランキング</p>
              <p className="text-white text-base font-black">他のユーザーと競う！</p>
              <p className="text-white/70 text-xs mt-0.5">ポイントトップを目指せ →</p>
            </div>
            <div className="text-4xl">🏆</div>
          </div>
        </div>

        {/* ══ 通知設定 ══ */}
        {notifSupported && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button
              onClick={() => setNotifOpen(v => !v)}
              className="w-full px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🔔</span>
                <div className="text-left">
                  <p className="text-gray-900 font-black text-sm">リマインド通知</p>
                  <p className="text-gray-400 text-xs">
                    {notifSettings.enabled ? `朝 ${notifSettings.morningHour}:${String(notifSettings.morningMinute).padStart(2,'0')} / 夜 ${notifSettings.eveningHour}:${String(notifSettings.eveningMinute).padStart(2,'0')}` : '未設定'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  onClick={e => { e.stopPropagation(); toggleNotifications() }}
                  className={`w-10 h-6 rounded-full transition-all cursor-pointer ${notifSettings.enabled ? 'bg-blue-500' : 'bg-gray-200'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-all ${notifSettings.enabled ? 'ml-4.5' : 'ml-0.5'}`} />
                </div>
                <span className="text-gray-300 text-xs">{notifOpen ? '▲' : '▼'}</span>
              </div>
            </button>

            {notifOpen && (
              <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
                {permission === 'denied' && (
                  <p className="text-red-400 text-xs bg-red-50 rounded-lg p-2">
                    ブラウザの通知許可がブロックされています。ブラウザ設定から許可してください。
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-500 text-xs font-bold block mb-1">朝リマインド</label>
                    <input
                      type="time"
                      value={`${String(notifSettings.morningHour).padStart(2,'0')}:${String(notifSettings.morningMinute).padStart(2,'0')}`}
                      onChange={e => {
                        const [h, m] = e.target.value.split(':')
                        saveNotifSettings({ morningHour: parseInt(h), morningMinute: parseInt(m) })
                      }}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs font-bold block mb-1">夜リマインド</label>
                    <input
                      type="time"
                      value={`${String(notifSettings.eveningHour).padStart(2,'0')}:${String(notifSettings.eveningMinute).padStart(2,'0')}`}
                      onChange={e => {
                        const [h, m] = e.target.value.split(':')
                        saveNotifSettings({ eveningHour: parseInt(h), eveningMinute: parseInt(m) })
                      }}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>
                <p className="text-gray-300 text-[10px]">※ 未記録の日のみ通知されます。アプリを開いている間のみ有効です。</p>
              </div>
            )}
          </div>
        )}

        {/* ログアウト */}
        <div className="text-center pt-1">
          <button
            onClick={signOut}
            className="text-gray-300 hover:text-gray-500 text-xs transition-colors"
          >
            ログアウト
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
