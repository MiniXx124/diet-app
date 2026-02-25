import { useEffect, useRef, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { analyzeFoodFromText, analyzeFoodFromImage, analyzePFCBalance } from '../lib/mealAnalyzer'
import { getAITrainerAdvice } from '../lib/trainerAI'
import BottomNav from '../components/BottomNav'

const MEAL_TYPES = [
  { value: 'breakfast', label: '🌅 朝食', short: '朝食', color: 'bg-orange-100 text-orange-600 border-orange-200' },
  { value: 'lunch',     label: '☀️ 昼食', short: '昼食', color: 'bg-yellow-100 text-yellow-600 border-yellow-200' },
  { value: 'dinner',    label: '🌙 夕食', short: '夕食', color: 'bg-blue-100 text-blue-600 border-blue-200' },
  { value: 'snack',     label: '🍩 間食', short: '間食', color: 'bg-pink-100 text-pink-600 border-pink-200' },
]

const CALORIE_GOAL = 2000

export default function MealPage() {
  const { user } = useAuthStore()
  const today = new Date().toISOString().split('T')[0]

  const [meals, setMeals]         = useState([])
  const [weekData, setWeekData]   = useState([])
  const [weekPFC, setWeekPFC]     = useState(null) // 週間PFC平均
  const [weekAdvice, setWeekAdvice] = useState(null)
  const [loading, setLoading]     = useState(true)

  // フォーム
  const [mealType,   setMealType]   = useState('breakfast')
  const [foodName,   setFoodName]   = useState('')
  const [nutrition,  setNutrition]  = useState(null)  // { calories, protein, fat, carbs }
  const [analyzing,  setAnalyzing]  = useState(false)
  const [listening,  setListening]  = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast,      setToast]      = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // テキスト入力のデバウンス用
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!user?.id) return
    fetchAll()
  }, [user?.id])

  const fetchAll = async () => {
    setLoading(true)
    await Promise.all([fetchTodayMeals(), fetchWeekData(), fetchWeekPFC()])
    setLoading(false)
  }

  const fetchTodayMeals = async () => {
    const { data } = await supabase
      .from('meal_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('recorded_date', today)
      .order('created_at', { ascending: true })
    setMeals(data ?? [])
  }

  const fetchWeekData = async () => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    const fromDate = sevenDaysAgo.toISOString().split('T')[0]

    const { data } = await supabase
      .from('meal_records')
      .select('recorded_date, calories')
      .eq('user_id', user.id)
      .gte('recorded_date', fromDate)

    const map = new Map()
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      map.set(dateStr, { date: `${d.getMonth()+1}/${d.getDate()}`, カロリー: 0 })
    }
    for (const r of data ?? []) {
      if (map.has(r.recorded_date)) map.get(r.recorded_date).カロリー += (r.calories ?? 0)
    }
    setWeekData([...map.values()])
  }

  // ── 週間PFC集計 ────────────────────────────────────────────
  const fetchWeekPFC = async () => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    const fromDate = sevenDaysAgo.toISOString().split('T')[0]

    const { data } = await supabase
      .from('meal_records')
      .select('recorded_date, calories, protein_g, fat_g, carbs_g')
      .eq('user_id', user.id)
      .gte('recorded_date', fromDate)

    if (!data || data.length === 0) { setWeekPFC(null); return }

    // 日ごとに集計
    const dayMap = new Map()
    for (const r of data) {
      if (!dayMap.has(r.recorded_date)) dayMap.set(r.recorded_date, { cal: 0, p: 0, f: 0, c: 0 })
      const d = dayMap.get(r.recorded_date)
      d.cal += r.calories ?? 0
      d.p   += r.protein_g ?? 0
      d.f   += r.fat_g ?? 0
      d.c   += r.carbs_g ?? 0
    }

    const days = [...dayMap.values()]
    const n = days.length
    const avgCal = Math.round(days.reduce((s, d) => s + d.cal, 0) / n)
    const avgP   = Math.round(days.reduce((s, d) => s + d.p,   0) / n)
    const avgF   = Math.round(days.reduce((s, d) => s + d.f,   0) / n)
    const avgC   = Math.round(days.reduce((s, d) => s + d.c,   0) / n)
    const balance = analyzePFCBalance(avgP, avgF, avgC)

    setWeekPFC({ avgCal, avgP, avgF, avgC, balance, days: n })

    // AI週次アドバイス
    const advice = await getAITrainerAdvice(
      { name: 'FitMentor', personality: '栄養バランスに詳しい優しいコーチ' },
      {
        nickname: '',
        weightTrend: null,
        calories: avgCal,
        streak: null,
        level: null,
        bmi: null,
      }
    )
    if (advice) setWeekAdvice(advice)
  }

  // ── AI分析（テキスト） ──────────────────────────────────────
  const runTextAnalysis = async (name) => {
    if (!name.trim()) { setNutrition(null); return }
    setAnalyzing(true)
    try {
      const result = await analyzeFoodFromText(name)
      if (result) setNutrition(result)
    } catch {
      /* silent fail */
    } finally {
      setAnalyzing(false)
    }
  }

  const handleFoodNameChange = (e) => {
    const val = e.target.value
    setFoodName(val)
    setNutrition(null)
    clearTimeout(debounceRef.current)
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(() => runTextAnalysis(val), 1200)
    }
  }

  // ── 写真入力 ────────────────────────────────────────────────
  const handlePhotoCapture = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAnalyzing(true)
    setNutrition(null)
    setFoodName('解析中...')
    try {
      const result = await analyzeFoodFromImage(file)
      if (result) {
        setFoodName(result.food_name || foodName)
        setNutrition({ calories: result.calories, protein: result.protein, fat: result.fat, carbs: result.carbs })
      } else {
        setFoodName('')
        showToast('写真から食品を認識できませんでした', 'error')
      }
    } catch {
      setFoodName('')
      showToast('解析に失敗しました', 'error')
    } finally {
      setAnalyzing(false)
      e.target.value = ''
    }
  }

  // ── 音声入力 ─────────────────────────────────────────────────
  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      showToast('音声入力はChrome/Safariで使えます', 'error')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'ja-JP'
    recognition.continuous = false
    recognition.interimResults = false
    setListening(true)

    recognition.onresult = async (e) => {
      const transcript = e.results[0][0].transcript
      setFoodName(transcript)
      setListening(false)
      await runTextAnalysis(transcript)
    }
    recognition.onerror = () => {
      setListening(false)
      showToast('音声認識に失敗しました', 'error')
    }
    recognition.onend = () => setListening(false)
    recognition.start()
  }

  // ── 追加 ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!foodName.trim()) { showToast('料理名を入力してください', 'error'); return }
    if (!nutrition)       { showToast('AI解析完了後に追加できます', 'error'); return }

    setSubmitting(true)
    try {
      const { error } = await supabase.from('meal_records').insert({
        user_id:       user.id,
        recorded_date: today,
        meal_type:     mealType,
        food_name:     foodName.trim(),
        calories:      nutrition.calories,
        protein_g:     nutrition.protein,
        fat_g:         nutrition.fat,
        carbs_g:       nutrition.carbs,
      })
      if (error) throw error

      await supabase.from('point_transactions').insert({
        user_id:     user.id,
        points:      30,
        reason:      'meal_record',
        description: `食事記録: ${foodName.trim()}`,
      })

      setFoodName('')
      setNutrition(null)
      await fetchAll()
      showToast('記録しました！ +30pt', 'success')
    } catch {
      showToast('記録に失敗しました', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    setDeletingId(id)
    await supabase.from('meal_records').delete().eq('id', id).eq('user_id', user.id)
    await fetchAll()
    setDeletingId(null)
  }

  const showToast = (msg, type) => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── 集計 ────────────────────────────────────────────────────
  const todayCalories = meals.reduce((s, m) => s + (m.calories ?? 0), 0)
  const todayProtein  = meals.reduce((s, m) => s + (m.protein_g ?? 0), 0)
  const todayFat      = meals.reduce((s, m) => s + (m.fat_g ?? 0), 0)
  const todayCarbs    = meals.reduce((s, m) => s + (m.carbs_g ?? 0), 0)
  const caloriePercent = Math.min(100, Math.round(todayCalories / CALORIE_GOAL * 100))
  const pfcBalance = meals.length > 0 ? analyzePFCBalance(todayProtein, todayFat, todayCarbs) : null

  // 食事タイプ別グルーピング
  const groupedMeals = MEAL_TYPES
    .map(t => ({ ...t, items: meals.filter(m => m.meal_type === t.value) }))
    .filter(g => g.items.length > 0)

  return (
    <div className="min-h-dvh bg-gray-50 pb-24">

      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-bold whitespace-nowrap ${
          toast.type === 'success' ? 'bg-blue-600 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100 px-5 pt-14 pb-4">
        <div className="max-w-sm mx-auto">
          <h1 className="text-gray-900 text-xl font-black">🍽️ 食事記録</h1>
          <p className="text-gray-400 text-xs mt-0.5">
            {new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
          </p>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4 pt-4 space-y-3">

        {/* ── 今日のカロリー ＋ PFCバランス ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-gray-900 font-black text-sm">🔥 今日の摂取</h2>
            <span className="text-gray-400 text-xs">目標 {CALORIE_GOAL.toLocaleString()} kcal</span>
          </div>

          {/* カロリーバー */}
          <div className="flex items-baseline gap-1 mb-2">
            <span className={`text-3xl font-black ${caloriePercent >= 100 ? 'text-red-500' : 'text-gray-900'}`}>
              {todayCalories.toLocaleString()}
            </span>
            <span className="text-gray-400 text-sm">kcal</span>
            {todayCalories > 0 && (
              <span className="text-gray-400 text-xs ml-1">({caloriePercent}%)</span>
            )}
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                caloriePercent >= 100 ? 'bg-red-400' : caloriePercent >= 80 ? 'bg-orange-400' : 'bg-green-500'
              }`}
              style={{ width: `${caloriePercent}%` }}
            />
          </div>

          {/* PFC数値 */}
          {(todayProtein + todayFat + todayCarbs) > 0 && (
            <>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {[
                  { label: 'P タンパク質', value: todayProtein, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'F 脂質',      value: todayFat,     color: 'text-yellow-600', bg: 'bg-yellow-50' },
                  { label: 'C 炭水化物',  value: todayCarbs,   color: 'text-green-600', bg: 'bg-green-50' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`${bg} rounded-xl p-2 text-center`}>
                    <p className="text-gray-400 text-[9px] font-bold mb-0.5">{label}</p>
                    <p className={`${color} text-base font-black`}>{Math.round(value)}<span className="text-[9px] font-normal text-gray-400">g</span></p>
                  </div>
                ))}
              </div>

              {/* PFC比率バー */}
              {pfcBalance && (
                <>
                  <div className="flex h-2 rounded-full overflow-hidden mb-2">
                    <div className="bg-blue-400 transition-all" style={{ width: `${pfcBalance.pPct}%` }} />
                    <div className="bg-yellow-400 transition-all" style={{ width: `${pfcBalance.fPct}%` }} />
                    <div className="bg-green-400 transition-all" style={{ width: `${pfcBalance.cPct}%` }} />
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-400 mb-2">
                    <span>P {pfcBalance.pPct}%</span>
                    <span>F {pfcBalance.fPct}%</span>
                    <span>C {pfcBalance.cPct}%</span>
                  </div>
                  {pfcBalance.warnings.map((w, i) => (
                    <p key={i} className={`text-xs font-semibold ${
                      w.level === 'good' ? 'text-green-600' :
                      w.level === 'bad'  ? 'text-red-500'   : 'text-orange-500'
                    }`}>
                      {w.level === 'good' ? '✅' : w.level === 'bad' ? '⚠️' : '💡'} {w.text}
                    </p>
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* ── 食事を追加 ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-gray-900 font-black text-sm">➕ 食事を追加</h2>
            <span className="text-blue-500 text-xs font-bold bg-blue-50 px-2 py-0.5 rounded-full">+30pt</span>
          </div>

          {/* 食事タイプ選択 */}
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {MEAL_TYPES.map(type => (
              <button
                key={type.value}
                onClick={() => setMealType(type.value)}
                className={`py-2 px-1 rounded-xl text-[10px] font-black border transition-all ${
                  mealType === type.value ? type.color + ' border-2' : 'bg-gray-50 text-gray-400 border-gray-100'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* 入力方法ボタン */}
          <div className="flex gap-2 mb-3">
            {/* 📷 写真 */}
            <label className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border font-bold text-sm cursor-pointer transition-all ${
              analyzing ? 'bg-gray-50 text-gray-300 border-gray-100' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 active:scale-95'
            }`}>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoCapture}
                disabled={analyzing}
              />
              📷 <span className="text-xs">写真</span>
            </label>

            {/* 🎤 音声 */}
            <button
              type="button"
              onClick={handleVoiceInput}
              disabled={analyzing || listening}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border font-bold text-sm transition-all active:scale-95 ${
                listening
                  ? 'bg-red-50 text-red-500 border-red-200 animate-pulse'
                  : analyzing
                  ? 'bg-gray-50 text-gray-300 border-gray-100'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              🎤 <span className="text-xs">{listening ? '聞いてる...' : '音声'}</span>
            </button>
          </div>

          {/* テキスト入力 */}
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={foodName}
                onChange={handleFoodNameChange}
                placeholder="料理名を入力（AIが自動計算）"
                maxLength={60}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-gray-300 pr-10"
              />
              {analyzing && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            {/* AI解析結果プレビュー */}
            {nutrition && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                <p className="text-blue-400 text-[10px] font-bold mb-1">🤖 AI推定</p>
                <div className="flex items-center justify-between">
                  <p className="text-blue-700 text-base font-black">{nutrition.calories} kcal</p>
                  <p className="text-blue-500 text-xs">
                    P{nutrition.protein}g / F{nutrition.fat}g / C{nutrition.carbs}g
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !foodName.trim() || !nutrition || analyzing}
              className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-black disabled:opacity-40 transition-all active:scale-[0.98]"
            >
              {submitting ? '追加中...' : analyzing ? 'AI解析中...' : !nutrition ? '料理名を入力してください' : `${foodName} を追加する`}
            </button>
          </form>
        </div>

        {/* ── 今日の食事リスト ── */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : groupedMeals.length > 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <h2 className="text-gray-900 font-black text-sm">📋 今日の食事</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {groupedMeals.map(group => (
                <div key={group.value}>
                  <div className="px-4 py-2 flex items-center justify-between bg-gray-50/50">
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${group.color}`}>
                      {group.label}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {group.items.reduce((s, m) => s + (m.calories ?? 0), 0)} kcal
                    </span>
                  </div>
                  {group.items.map(meal => (
                    <div key={meal.id} className="px-4 py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-gray-800 text-sm font-semibold">{meal.food_name}</p>
                        <p className="text-gray-400 text-xs">
                          {meal.calories}kcal
                          {(meal.protein_g || meal.fat_g || meal.carbs_g) && (
                            <span className="ml-1.5">
                              P{Math.round(meal.protein_g ?? 0)}g F{Math.round(meal.fat_g ?? 0)}g C{Math.round(meal.carbs_g ?? 0)}g
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(meal.id)}
                        disabled={deletingId === meal.id}
                        className="text-gray-300 hover:text-red-400 transition-colors text-lg p-1 leading-none"
                      >
                        {deletingId === meal.id ? '…' : '✕'}
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-4xl mb-2">🍽️</p>
            <p className="text-gray-400 text-sm font-bold">今日の食事を記録しよう</p>
            <p className="text-gray-300 text-xs mt-1">写真・音声・テキストで入力できます</p>
          </div>
        )}

        {/* ── 週間PFCレポート ── */}
        {weekPFC && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-gray-900 font-black text-sm">🧬 週間栄養レポート</h2>
              <span className="text-gray-400 text-xs">{weekPFC.days}日間の平均</span>
            </div>

            {/* 平均値 */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { label: 'カロリー', value: weekPFC.avgCal, unit: 'kcal', color: 'text-gray-900' },
                { label: 'タンパク質', value: weekPFC.avgP, unit: 'g', color: 'text-blue-600' },
                { label: '脂質', value: weekPFC.avgF, unit: 'g', color: 'text-yellow-600' },
                { label: '炭水化物', value: weekPFC.avgC, unit: 'g', color: 'text-green-600' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-gray-400 text-[9px] font-bold mb-0.5">{s.label}</p>
                  <p className={`text-base font-black ${s.color}`}>{s.value}</p>
                  <p className="text-gray-400 text-[9px]">{s.unit}</p>
                </div>
              ))}
            </div>

            {/* PFC比率バー */}
            {weekPFC.balance && (
              <>
                <div className="flex h-2.5 rounded-full overflow-hidden mb-1.5">
                  <div className="bg-blue-400" style={{ width: `${weekPFC.balance.pPct}%` }} />
                  <div className="bg-yellow-400" style={{ width: `${weekPFC.balance.fPct}%` }} />
                  <div className="bg-green-400" style={{ width: `${weekPFC.balance.cPct}%` }} />
                </div>
                <div className="flex justify-between text-[9px] text-gray-400 mb-2">
                  <span>P {weekPFC.balance.pPct}%</span>
                  <span>F {weekPFC.balance.fPct}%</span>
                  <span>C {weekPFC.balance.cPct}%</span>
                </div>
                {weekPFC.balance.warnings.map((w, i) => (
                  <p key={i} className={`text-xs font-semibold ${w.level === 'good' ? 'text-green-600' : w.level === 'bad' ? 'text-red-500' : 'text-orange-500'}`}>
                    {w.level === 'good' ? '✅' : w.level === 'bad' ? '⚠️' : '💡'} {w.text}
                  </p>
                ))}
              </>
            )}

            {/* AIアドバイス */}
            {weekAdvice && (
              <div className="mt-3 pt-3 border-t border-gray-50 flex gap-2 items-start">
                <span className="text-lg shrink-0">🤖</span>
                <p className="text-gray-600 text-xs leading-relaxed">{weekAdvice}</p>
              </div>
            )}
          </div>
        )}

        {/* ── 週間カロリーグラフ ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="text-gray-900 font-black text-sm mb-3">📈 週間カロリー推移</h2>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weekData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v) => [`${v.toLocaleString()} kcal`, 'カロリー']}
                contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e5e7eb' }}
              />
              <ReferenceLine y={CALORIE_GOAL} stroke="#fca5a5" strokeDasharray="4 4" />
              <Bar dataKey="カロリー" fill="#3b82f6" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-gray-300 text-[10px] text-right mt-1">赤破線 = 目標 {CALORIE_GOAL.toLocaleString()} kcal</p>
        </div>

      </div>

      <BottomNav />
    </div>
  )
}
