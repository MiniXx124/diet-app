import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useDashboardStore } from '../stores/dashboardStore'
import { supabase } from '../lib/supabase'
import {
  sendChatMessage,
  sendChatMessageWithImage,
  getLocalGreeting,
} from '../lib/trainerChat'
import { ensureTrainerImage } from '../lib/trainerImageGen'

// ─── 定数 ─────────────────────────────────────────────────
const FREE_SESSION_LIMIT = 5
const POINTS_PER_MEAL    = 30

// ─── 日付ストリップ ──────────────────────────────────────
function DateStrip() {
  const navigate = useNavigate()
  const today = new Date()
  const weekday = ['日', '月', '火', '水', '木', '金', '土']

  const days = []
  for (let i = -3; i <= 3; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push({ date: d, offset: i })
  }

  return (
    <div className="flex items-center justify-around px-1 py-2">
      {days.map(({ date, offset }) => {
        const isToday = offset === 0
        const yyyy = date.getFullYear()
        const mm   = String(date.getMonth() + 1).padStart(2, '0')
        const dd   = String(date.getDate()).padStart(2, '0')
        const dateStr = `${yyyy}-${mm}-${dd}`
        return (
          <button
            key={dateStr}
            style={{ touchAction: 'manipulation' }}
            onClick={() => navigate(`/record?date=${dateStr}`)}
            className={`flex flex-col items-center px-2 py-1.5 rounded-xl min-w-[40px] transition-colors ${
              isToday ? 'bg-emerald-500' : 'active:bg-gray-100'
            }`}
          >
            <span className={`text-[10px] font-medium leading-none mb-0.5 ${
              isToday ? 'text-white/80' : 'text-gray-400'
            }`}>
              {isToday ? '今日' : weekday[date.getDay()]}
            </span>
            <span className={`text-sm font-bold leading-tight ${
              isToday ? 'text-white' : 'text-gray-700'
            }`}>
              {date.getDate()}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── 吹き出し ──────────────────────────────────────────
function SpeechBubble({ message, trainerName }) {
  const text = message ?? `こんにちは！今日も一緒に頑張りましょう💪`
  return (
    <div className="flex-1 flex items-center pl-2 pr-4 py-3">
      <div className="relative bg-white rounded-2xl rounded-tl-sm px-3 py-3 shadow-sm border border-gray-100 w-full">
        {/* 左向きの三角（枠線） */}
        <div
          className="absolute top-4"
          style={{
            left: '-9px',
            width: 0, height: 0,
            borderTop: '7px solid transparent',
            borderBottom: '7px solid transparent',
            borderRight: '10px solid #e5e7eb',
          }}
        />
        {/* 左向きの三角（白） */}
        <div
          className="absolute top-4"
          style={{
            left: '-7px',
            width: 0, height: 0,
            borderTop: '7px solid transparent',
            borderBottom: '7px solid transparent',
            borderRight: '10px solid white',
          }}
        />
        <p className="text-xs text-gray-700 leading-relaxed line-clamp-4">
          {text}
        </p>
      </div>
    </div>
  )
}

// ─── メッセージバブル ──────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex items-end gap-2 mb-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-sm shrink-0 mb-1">
          {msg.trainerEmoji ?? '🤖'}
        </div>
      )}
      <div
        className={`max-w-[78%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-emerald-500 text-white rounded-br-sm'
            : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
        }`}
      >
        {msg.imagePreview && (
          <img
            src={msg.imagePreview}
            alt="food"
            className="w-36 h-28 object-cover rounded-xl mb-2"
          />
        )}
        {msg.content}
      </div>
    </div>
  )
}

// ─── 過去セッション ────────────────────────────────────────
function PastSession({ session, trainerEmoji }) {
  const [open, setOpen] = useState(false)
  const date  = new Date(session.created_at)
  const label = date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white mb-2">
      <button
        style={{ touchAction: 'manipulation' }}
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-600"
      >
        <span className="font-medium">{label} のチャット</span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-50">
          {session.messages.map((m, i) => (
            <MessageBubble key={i} msg={{ ...m, trainerEmoji }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 体重入力モーダル ──────────────────────────────────────
function WeightModal({ trainer, onClose, onSubmit }) {
  const [kg, setKg]           = useState('')
  const [timeOfDay, setTimeOfDay] = useState('morning')

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
      <div className="w-full bg-white rounded-t-3xl px-6 pt-5 pb-8">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h3 className="text-base font-bold text-gray-800 mb-4">⚖️ 体重を記録</h3>

        <div className="flex gap-2 mb-4">
          {['morning', 'evening'].map(t => (
            <button
              key={t}
              style={{ touchAction: 'manipulation' }}
              onClick={() => setTimeOfDay(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                timeOfDay === t ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {t === 'morning' ? '🌅 朝' : '🌙 夜'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-5">
          <input
            type="number"
            step="0.1"
            value={kg}
            onChange={e => setKg(e.target.value)}
            placeholder="00.0"
            style={{ fontSize: '16px' }}
            className="flex-1 text-3xl font-bold text-center text-gray-800 bg-gray-50 border border-gray-200 rounded-2xl py-4 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <span className="text-lg font-semibold text-gray-500">kg</span>
        </div>

        <div className="flex gap-3">
          <button
            style={{ touchAction: 'manipulation' }}
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-medium text-gray-600"
          >
            キャンセル
          </button>
          <button
            style={{ touchAction: 'manipulation' }}
            onClick={() => {
              const val = parseFloat(kg)
              if (val > 20 && val < 300) onSubmit(val, timeOfDay)
            }}
            className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white text-sm font-bold"
          >
            記録する
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── インラインBottomNav（fixedなし） ────────────────────
function BottomNavInline() {
  const navigate  = useNavigate()
  const { pathname } = useLocation()

  const items = [
    { path: '/dashboard', icon: '🏠', label: 'トレーナー' },
    { path: '/record',    icon: '📝', label: '記録' },
    { path: '/settings',  icon: '⚙️',  label: '設定' },
  ]

  return (
    <div
      className="flex-shrink-0 bg-white border-t border-gray-100"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {items.map(item => {
          const active = pathname === item.path
          return (
            <button
              key={item.path}
              style={{ touchAction: 'manipulation' }}
              onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center py-3 gap-0.5 ${
                active ? 'text-emerald-600' : 'text-gray-400'
              }`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className={`text-[10px] font-bold mt-0.5 ${active ? 'text-emerald-600' : 'text-gray-400'}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── メインコンポーネント ──────────────────────────────────
export default function TrainerChatPage() {
  const { user, profile } = useAuthStore()
  const { trainer, userTrainer, consecutiveDays, loading, addWeightRecord, fetchDashboard } =
    useDashboardStore()

  const [messages, setMessages]         = useState([])
  const [pastSessions, setPastSessions] = useState([])
  const [input, setInput]               = useState('')
  const [sending, setSending]           = useState(false)
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [actionFeedback, setActionFeedback]   = useState(null)

  // トレーナー画像
  const [trainerImageUrl, setTrainerImageUrl] = useState(null)
  const [imageGenerating, setImageGenerating] = useState(false)
  const [imageError, setImageError]           = useState(null)
  const imageTriggeredRef = useRef(false)
  const prevMoodRef       = useRef(null)

  const sessionId   = useRef(crypto.randomUUID())
  const bottomRef   = useRef(null)
  const fileInputRef = useRef(null)

  // ── トレーナーグラデーション ──
  const gradientMap = {
    ryuya:  'from-red-600 via-red-500 to-orange-500',
    yoko:   'from-yellow-400 via-orange-400 to-orange-500',
    takumi: 'from-blue-700 via-blue-500 to-indigo-500',
    ren:    'from-gray-900 via-rose-900 to-red-800',
    sakura: 'from-pink-300 via-pink-400 to-rose-400',
    kenta:  'from-teal-500 via-emerald-500 to-emerald-600',
  }
  const gradient = gradientMap[trainer?.code] ?? 'from-emerald-600 to-teal-500'

  const level     = userTrainer?.current_level ?? 1
  const mood      = userTrainer?.mood ?? 'motivated'
  const moodMap   = { hyped: '🔥', motivated: '😄', normal: '🙂', concerned: '😕', disappointed: '😞', angry: '😤' }
  const moodEmoji = moodMap[mood] ?? '🙂'

  // 最新のトレーナーメッセージ（吹き出し用）
  const latestTrainerMsg = [...messages].reverse().find(m => m.role === 'assistant')?.content

  // ─── 初期ロード ───────────────────────────────────────
  useEffect(() => {
    if (!user) return
    fetchDashboard(user.id, profile)
    loadPastSessions()
  }, [user?.id])

  // ─── 画像生成 ─────────────────────────────────────────
  const triggerImageGeneration = useCallback(() => {
    if (!trainer || !user) return
    const currentMood = userTrainer?.mood ?? 'motivated'
    setImageGenerating(true)
    setImageError(null)
    ensureTrainerImage(user.id, trainer.code, null, currentMood)
      .then(url => {
        if (url) { setTrainerImageUrl(url); setImageError(null) }
        else setImageError('URLが取得できませんでした')
      })
      .catch(err => {
        const msg = err?.message ?? String(err)
        setImageError(msg.length > 80 ? msg.slice(0, 80) + '…' : msg)
      })
      .finally(() => setImageGenerating(false))
  }, [trainer?.code, user?.id, userTrainer?.mood])

  // ─── 既存URL or 新規生成 ──────────────────────────────
  useEffect(() => {
    if (!trainer || !user || !userTrainer) return
    if (imageTriggeredRef.current) return
    imageTriggeredRef.current = true

    const existingUrl = userTrainer.trainer_image_url
    if (existingUrl) { setTrainerImageUrl(existingUrl); return }

    prevMoodRef.current = userTrainer.mood ?? 'motivated'
    triggerImageGeneration()
  }, [trainer?.code, userTrainer?.id])

  // ─── mood変化で再生成（6時間制限） ───────────────────
  useEffect(() => {
    if (!trainer || !user || !userTrainer || !imageTriggeredRef.current) return
    if (imageGenerating) return

    const currentMood = userTrainer.mood ?? 'motivated'
    if (prevMoodRef.current === null || prevMoodRef.current === currentMood) return
    prevMoodRef.current = currentMood

    const rateKey    = `mood_regen_${user.id}_${trainer.code}`
    const last       = Number(localStorage.getItem(rateKey) ?? 0)
    const hoursSince = (Date.now() - last) / 3_600_000
    if (hoursSince < 6) return

    localStorage.setItem(rateKey, String(Date.now()))
    supabase.from('user_trainers')
      .update({ trainer_image_url: null })
      .eq('user_id', user.id)
      .eq('is_current', true)
      .then(() => {
        setTrainerImageUrl(null)
        imageTriggeredRef.current = false
        triggerImageGeneration()
      })
  }, [userTrainer?.mood])

  // ─── 挨拶メッセージ ───────────────────────────────────
  useEffect(() => {
    if (!trainer || messages.length > 0) return
    const greeting = getLocalGreeting(trainer, {
      nickname: profile?.username ?? '',
      streak:   consecutiveDays,
      hasRecordedToday: false,
    })
    setMessages([{ role: 'assistant', content: greeting, trainerEmoji: trainer.emoji }])
  }, [trainer?.code])

  // ─── 自動スクロール ───────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── 過去セッション ───────────────────────────────────
  const loadPastSessions = async () => {
    if (!user) return
    try {
      const { data: sessionRows } = await supabase
        .from('chat_messages')
        .select('session_id, created_at')
        .eq('user_id', user.id)
        .neq('session_id', sessionId.current)
        .order('created_at', { ascending: false })

      if (!sessionRows?.length) return

      const seen = new Set()
      const sessionIds = []
      for (const row of sessionRows) {
        if (!seen.has(row.session_id)) {
          seen.add(row.session_id)
          sessionIds.push({ id: row.session_id, created_at: row.created_at })
          if (sessionIds.length >= FREE_SESSION_LIMIT) break
        }
      }

      const sessions = await Promise.all(
        sessionIds.map(async (s) => {
          const { data: msgs } = await supabase
            .from('chat_messages')
            .select('role, content, created_at')
            .eq('user_id', user.id)
            .eq('session_id', s.id)
            .order('created_at', { ascending: true })
          return { session_id: s.id, created_at: s.created_at, messages: msgs ?? [] }
        })
      )
      setPastSessions(sessions.filter(s => s.messages.length > 0))
    } catch (e) {
      console.warn('Past sessions load failed:', e.message)
    }
  }

  // ─── DB保存 ───────────────────────────────────────────
  const saveMessageToDB = async (role, content, actions = []) => {
    if (!user) return
    try {
      await supabase.from('chat_messages').insert({
        user_id: user.id, session_id: sessionId.current, role, content, actions,
      })
    } catch { /* テーブル未作成でも無視 */ }
  }

  // ─── アクション実行 ───────────────────────────────────
  const executeActions = async (actions) => {
    if (!actions?.length || !user) return
    const feedbacks = []

    for (const action of actions) {
      if (action.type === 'weight_record') {
        const kg = parseFloat(action.kg)
        const time = action.time_of_day ?? 'morning'
        if (kg > 20 && kg < 300) {
          await addWeightRecord(user.id, time, kg)
          feedbacks.push(`⚖️ ${kg}kg を記録しました！`)
        }
      }
      if (action.type === 'meal_record') {
        const today = new Date().toISOString().split('T')[0]
        await supabase.from('meal_records').insert({
          user_id: user.id, meal_date: today,
          meal_type: action.meal_type ?? 'other',
          food_name: action.food_name ?? '食事',
          calories: action.calories ?? 0,
          protein: action.protein ?? 0,
          fat: action.fat ?? 0,
          carbs: action.carbs ?? 0,
          input_method: 'ai_chat',
        })
        await supabase.from('point_transactions').insert({
          user_id: user.id, points: POINTS_PER_MEAL,
          reason: 'meal_record', description: action.food_name ?? '食事記録',
        })
        feedbacks.push(`🍽 ${action.food_name ?? '食事'} を記録しました！`)
      }
    }

    if (feedbacks.length > 0) {
      setActionFeedback(feedbacks.join('  '))
      setTimeout(() => setActionFeedback(null), 3000)
    }
  }

  // ─── テキスト送信 ─────────────────────────────────────
  const handleSend = useCallback(async (text = input.trim()) => {
    if (!text || sending || !trainer) return
    setInput('')

    const userMsg    = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setSending(true)
    await saveMessageToDB('user', text)

    const apiHistory = newMessages.slice(-10).map(m => ({ role: m.role, content: m.content }))
    const userCtx = {
      nickname: profile?.username ?? '',
      currentWeight: null,
      targetWeight: profile?.goal_weight ?? null,
      streak: consecutiveDays,
      level: userTrainer?.current_level ?? 1,
    }

    const result = await sendChatMessage(apiHistory, trainer, userCtx)
    const assistantMsg = { role: 'assistant', content: result.message, trainerEmoji: trainer.emoji }
    setMessages(prev => [...prev, assistantMsg])
    setSending(false)
    await saveMessageToDB('assistant', result.message, result.actions)
    await executeActions(result.actions)
  }, [input, sending, trainer, messages, profile, userTrainer, consecutiveDays])

  // ─── 画像送信 ─────────────────────────────────────────
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !trainer) return

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64    = ev.target.result.split(',')[1]
      const previewUrl = ev.target.result

      const userMsg    = { role: 'user', content: '📷 食事の写真を送りました', imagePreview: previewUrl }
      const newMessages = [...messages, userMsg]
      setMessages(newMessages)
      setSending(true)
      await saveMessageToDB('user', '📷 食事の写真を送りました')

      const apiHistory = newMessages.slice(-10)
        .map(m => ({ role: m.role, content: m.content }))
        .concat([{ role: 'user', content: 'この食事の内容と栄養を記録してください' }])

      const userCtx = {
        nickname: profile?.username ?? '',
        targetWeight: profile?.goal_weight ?? null,
        streak: consecutiveDays,
        level: userTrainer?.current_level ?? 1,
      }

      const result = await sendChatMessageWithImage(apiHistory.slice(0, -1), trainer, userCtx, base64)
      const assistantMsg = { role: 'assistant', content: result.message, trainerEmoji: trainer.emoji }
      setMessages(prev => [...prev, assistantMsg])
      setSending(false)
      await saveMessageToDB('assistant', result.message, result.actions)
      await executeActions(result.actions)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ─── 体重モーダルから記録 ─────────────────────────────
  const handleWeightSubmit = async (kg, timeOfDay) => {
    setShowWeightModal(false)
    if (!trainer) return

    const label   = timeOfDay === 'morning' ? '朝' : '夜'
    const userMsg = { role: 'user', content: `${label}の体重は${kg}kgです` }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setSending(true)
    await saveMessageToDB('user', userMsg.content)

    const apiHistory = newMessages.slice(-10).map(m => ({ role: m.role, content: m.content }))
    const userCtx = {
      nickname: profile?.username ?? '',
      targetWeight: profile?.goal_weight ?? null,
      streak: consecutiveDays,
      level: userTrainer?.current_level ?? 1,
    }

    const result = await sendChatMessage(apiHistory, trainer, userCtx)
    const assistantMsg = { role: 'assistant', content: result.message, trainerEmoji: trainer.emoji }
    setMessages(prev => [...prev, assistantMsg])
    setSending(false)
    await saveMessageToDB('assistant', result.message, result.actions)
    await executeActions(result.actions)
  }

  // ─── ローディング ─────────────────────────────────────
  if (loading && !trainer) {
    return (
      <div style={{ height: '100dvh' }} className="bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">🤖</div>
          <p className="text-sm text-gray-400">トレーナーを呼んでいます...</p>
        </div>
      </div>
    )
  }

  // ─── レンダリング ─────────────────────────────────────
  return (
    <div
      className="flex flex-col bg-gray-50"
      style={{ height: '100dvh', overflow: 'hidden' }}
    >
      {/* ── 1. ステータスバー余白 + 日付ストリップ ── */}
      <div
        className="flex-shrink-0 bg-white border-b border-gray-100"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <DateStrip />
      </div>

      {/* ── 2. トレーナーパネル ── */}
      <div className="flex-shrink-0 flex bg-white border-b border-gray-100" style={{ height: '180px' }}>

        {/* 左: トレーナー画像 */}
        <div className="relative overflow-hidden flex-shrink-0" style={{ width: '130px' }}>
          {/* グラデーション背景 */}
          <div className={`absolute inset-0 bg-gradient-to-b ${gradient}`} />

          {/* 生成済み画像 */}
          {trainerImageUrl && (
            <img
              src={trainerImageUrl}
              alt={trainer?.name}
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
          )}

          {/* 生成中 */}
          {!trainerImageUrl && imageGenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <div className="text-4xl animate-pulse">{trainer?.emoji ?? '🤖'}</div>
              <div className="flex gap-1">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}

          {/* エラー */}
          {!trainerImageUrl && !imageGenerating && imageError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-2">
              <div className="text-3xl">{trainer?.emoji ?? '🤖'}</div>
              <button
                style={{ touchAction: 'manipulation' }}
                onClick={() => {
                  imageTriggeredRef.current = false
                  triggerImageGeneration()
                }}
                className="bg-white/20 text-white text-[10px] px-2 py-1 rounded-full"
              >
                🔄 再試行
              </button>
            </div>
          )}

          {/* フォールバック */}
          {!trainerImageUrl && !imageGenerating && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-6xl">{trainer?.emoji ?? '🤖'}</div>
            </div>
          )}

          {/* 名前オーバーレイ */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-2">
            <div className="text-white text-xs font-bold leading-tight">{trainer?.name ?? ''}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-white/70 text-[10px]">Lv.{level}</span>
              <span className="text-sm leading-none">{moodEmoji}</span>
            </div>
          </div>
        </div>

        {/* 右: 吹き出し */}
        <SpeechBubble message={latestTrainerMsg} trainerName={trainer?.name} />
      </div>

      {/* ── 3. チャットエリア（flex-1で残りを全部使う） ── */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-3"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* アクションフィードバック */}
        {actionFeedback && (
          <div className="sticky top-0 z-10 mx-auto w-fit bg-emerald-500 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg mb-2">
            {actionFeedback}
          </div>
        )}

        {/* 過去セッション */}
        {pastSessions.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-400 font-medium mb-2 text-center">── 過去のチャット ──</p>
            {pastSessions.map(s => (
              <PastSession key={s.session_id} session={s} trainerEmoji={trainer?.emoji} />
            ))}
            <p className="text-xs text-gray-400 text-center mb-3">── 今日のチャット ──</p>
          </div>
        )}

        {/* 現セッションのメッセージ */}
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {/* 送信中インジケーター */}
        {sending && (
          <div className="flex items-end gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-sm shrink-0">
              {trainer?.emoji ?? '🤖'}
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1.5">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} className="h-2" />
      </div>

      {/* ── 4. 入力エリア（flex-shrinkなし） ── */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 pt-2.5 pb-2.5">
        {/* アクションボタン */}
        <div className="flex gap-2 mb-2">
          <button
            style={{ touchAction: 'manipulation' }}
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-50 text-amber-600 text-sm font-medium border border-amber-100"
          >
            📷 <span>写真</span>
          </button>
          <button
            style={{ touchAction: 'manipulation' }}
            onClick={() => setShowWeightModal(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-100"
          >
            ⚖️ <span>体重</span>
          </button>
        </div>

        {/* テキスト入力 */}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={trainer ? `${trainer.name}に話しかける...` : 'メッセージを入力...'}
            rows={1}
            style={{ fontSize: '16px', lineHeight: '1.5', touchAction: 'manipulation' }}
            className="flex-1 resize-none bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 max-h-24 overflow-y-auto"
          />
          <button
            style={{ touchAction: 'manipulation' }}
            onClick={() => handleSend()}
            disabled={!input.trim() || sending}
            className="w-11 h-11 bg-emerald-500 rounded-full flex items-center justify-center text-white text-base disabled:opacity-40 shrink-0"
          >
            ▶
          </button>
        </div>
      </div>

      {/* ── 5. BottomNav（非fixed、flex-shrink-0） ── */}
      <BottomNavInline />

      {/* 隠しファイルインプット */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageSelect}
      />

      {/* 体重入力モーダル */}
      {showWeightModal && (
        <WeightModal
          trainer={trainer}
          onClose={() => setShowWeightModal(false)}
          onSubmit={handleWeightSubmit}
        />
      )}
    </div>
  )
}
