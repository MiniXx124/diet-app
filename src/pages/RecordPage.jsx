import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useDashboardStore } from '../stores/dashboardStore'
import { supabase } from '../lib/supabase'
import { analyzeFoodFromText } from '../lib/mealAnalyzer'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import BottomNav from '../components/BottomNav'

// ─── 定数 ─────────────────────────────────────────────────
const POINTS_PER_MEAL = 30

const MEAL_TYPES = [
  { key: 'breakfast', label: '朝食', emoji: '🌅', color: 'amber' },
  { key: 'lunch',     label: '昼食', emoji: '☀️',  color: 'orange' },
  { key: 'dinner',    label: '夕食', emoji: '🌙', color: 'indigo' },
  { key: 'snack',     label: '間食', emoji: '🍩', color: 'pink' },
]

const COLOR_MAP = {
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-700',  btn: 'bg-amber-400',  tab: 'bg-amber-500'  },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200',text: 'text-orange-700', btn: 'bg-orange-400', tab: 'bg-orange-500' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200',text: 'text-indigo-700', btn: 'bg-indigo-400', tab: 'bg-indigo-500' },
  pink:   { bg: 'bg-pink-50',   border: 'border-pink-200',  text: 'text-pink-700',   btn: 'bg-pink-400',   tab: 'bg-pink-500'   },
}

// ─── 体重入力カード（インライン展開） ─────────────────────
function WeightCard({ timeOfDay, existing, onSave, submitting }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')

  const isMorning = timeOfDay === 'morning'
  const label  = isMorning ? '朝' : '夜'
  const emoji  = isMorning ? '🌅' : '🌙'
  const scheme = isMorning
    ? { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', btn: 'bg-amber-400 hover:bg-amber-500' }
    : { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700', btn: 'bg-indigo-400 hover:bg-indigo-500' }

  if (editing) {
    return (
      <div className={`flex-1 rounded-2xl border-2 ${scheme.border} ${scheme.bg} p-4`}>
        <p className={`text-xs font-bold mb-2.5 ${scheme.text}`}>{emoji} {label}の体重</p>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            step="0.1"
            autoFocus
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const kg = parseFloat(val)
                if (kg > 20 && kg < 300) { onSave(timeOfDay, kg); setEditing(false); setVal('') }
              }
            }}
            placeholder={existing ? String(existing) : '00.0'}
            className="flex-1 text-2xl font-bold text-center text-gray-800 bg-white border border-gray-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <span className="text-sm font-semibold text-gray-400">kg</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditing(false); setVal('') }}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-xs text-gray-500 bg-white">
            キャンセル
          </button>
          <button
            onClick={() => {
              const kg = parseFloat(val)
              if (kg > 20 && kg < 300) { onSave(timeOfDay, kg); setEditing(false); setVal('') }
            }}
            disabled={submitting || !val}
            className={`flex-1 py-2 rounded-xl text-white text-xs font-bold ${scheme.btn} disabled:opacity-40 transition-colors`}
          >
            {submitting ? '保存中...' : '記録する'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => { setEditing(true); setVal(existing ? String(existing) : '') }}
      className={`flex-1 rounded-2xl border-2 ${scheme.border} ${scheme.bg} p-4 text-left active:scale-95 transition-transform`}
    >
      <p className={`text-xs font-bold mb-1 ${scheme.text}`}>{emoji} {label}</p>
      {existing != null ? (
        <>
          <p className="text-2xl font-bold text-gray-800 leading-none">
            {existing}<span className="text-sm font-normal text-gray-400 ml-1">kg</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-1">タップして修正</p>
        </>
      ) : (
        <>
          <p className="text-2xl font-bold text-gray-300 leading-none">
            --<span className="text-sm font-normal ml-1">kg</span>
          </p>
          <p className={`text-[11px] font-semibold mt-1 ${scheme.text}`}>タップして記録</p>
        </>
      )}
    </button>
  )
}

// ─── 食事追加インライン（AI解析付き） ─────────────────────
function AddMealInline({ mealType, onAdd, onCancel }) {
  const [foodName, setFoodName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein,  setProtein]  = useState('')
  const [fat,      setFat]      = useState('')
  const [carbs,    setCarbs]    = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzed,  setAnalyzed]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const inputRef = useRef(null)

  const type = MEAL_TYPES.find(t => t.key === mealType)
  const c = COLOR_MAP[type?.color ?? 'amber']

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const handleAnalyze = async () => {
    if (!foodName.trim() || analyzing) return
    setAnalyzing(true)
    setAnalyzed(false)
    const result = await analyzeFoodFromText(foodName.trim())
    setAnalyzing(false)
    if (result) {
      setCalories(String(result.calories))
      setProtein(String(result.protein))
      setFat(String(result.fat))
      setCarbs(String(result.carbs))
      setAnalyzed(true)
    } else {
      alert('栄養情報を取得できませんでした。手動で入力してください。')
    }
  }

  const handleSave = async () => {
    if (!foodName.trim() || !calories || saving) return
    setSaving(true)
    await onAdd({
      food_name: foodName.trim(),
      calories:  parseInt(calories)   || 0,
      protein:   parseFloat(protein)  || 0,
      fat:       parseFloat(fat)      || 0,
      carbs:     parseFloat(carbs)    || 0,
      meal_type: mealType,
    })
    setSaving(false)
  }

  return (
    <div className={`${c.bg} border ${c.border} rounded-2xl p-4 mt-3`}>
      {/* 食事名 + AI解析 */}
      <p className={`text-xs font-bold mb-2 ${c.text}`}>食事名を入力</p>
      <div className="flex gap-2 mb-3">
        <input
          ref={inputRef}
          value={foodName}
          onChange={e => { setFoodName(e.target.value); setAnalyzed(false) }}
          onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
          placeholder="例：コンビニのサラダチキン"
          className="flex-1 border border-gray-200 bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        <button
          onClick={handleAnalyze}
          disabled={!foodName.trim() || analyzing}
          className={`px-3 py-2.5 rounded-xl text-white text-xs font-bold ${c.btn} disabled:opacity-40 shrink-0 transition-all`}
        >
          {analyzing ? (
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>
              解析中
            </span>
          ) : analyzed ? '✓ 解析済' : '🤖 AI解析'}
        </button>
      </div>

      {/* 解析結果・手動入力 */}
      {(analyzed || calories) && (
        <div className="bg-white rounded-xl p-3 mb-3 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-600">栄養情報</p>
            {analyzed && (
              <span className="text-[10px] bg-emerald-100 text-emerald-600 font-bold px-2 py-0.5 rounded-full">
                🤖 AI推定
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'kcal', val: calories, set: setCalories, bold: true },
              { label: 'P(g)',  val: protein,  set: setProtein },
              { label: 'F(g)',  val: fat,      set: setFat },
              { label: 'C(g)',  val: carbs,    set: setCarbs },
            ].map(({ label, val, set, bold }) => (
              <div key={label} className="text-center">
                <p className="text-[10px] text-gray-400 mb-1">{label}</p>
                <input
                  type="number"
                  step="0.1"
                  value={val}
                  onChange={e => set(e.target.value)}
                  className={`w-full text-center text-sm rounded-lg border border-gray-200 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 ${bold ? 'font-bold text-gray-800' : 'text-gray-600'}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ボタン */}
      <div className="flex gap-2">
        <button onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-500">
          キャンセル
        </button>
        {!analyzed && !calories ? (
          <button
            onClick={handleAnalyze}
            disabled={!foodName.trim() || analyzing}
            className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold ${c.btn} disabled:opacity-40`}
          >
            {analyzing ? '解析中...' : '🤖 AI解析する'}
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={!foodName.trim() || !calories || saving}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold disabled:opacity-40"
          >
            {saving ? '追加中...' : '記録する'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── 食事タイプ別パネル ────────────────────────────────────
function MealTypePanel({ mealType, meals, onAdd, onDelete }) {
  const [adding, setAdding] = useState(false)
  const type = MEAL_TYPES.find(t => t.key === mealType)
  const c = COLOR_MAP[type?.color ?? 'amber']

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-base">{type?.emoji}</span>
          <span className="text-sm font-bold text-gray-700">{type?.label}</span>
          {meals.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-full">
              {meals.reduce((s, m) => s + (m.calories || 0), 0)} kcal
            </span>
          )}
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className={`text-xs font-bold ${c.text} ${c.bg} border ${c.border} px-3 py-1.5 rounded-xl active:scale-95 transition-transform`}
          >
            ＋ 追加
          </button>
        )}
      </div>

      <div className="px-4">
        {/* 記録済み食事 */}
        {meals.length > 0 ? (
          <div className="py-1">
            {meals.map(meal => (
              <div key={meal.id}
                className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{meal.food_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    <span className="font-semibold text-gray-600">{meal.calories}kcal</span>
                    {' · '}P{meal.protein}g · F{meal.fat}g · C{meal.carbs}g
                  </p>
                </div>
                <button onClick={() => onDelete(meal.id)}
                  className="text-gray-300 hover:text-red-400 text-lg leading-none px-1 transition-colors shrink-0">
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : !adding ? (
          <div className="py-4 text-center">
            <p className="text-xs text-gray-300">まだ記録がありません</p>
          </div>
        ) : null}

        {/* 追加フォーム */}
        {adding && (
          <AddMealInline
            mealType={mealType}
            onAdd={async (data) => { await onAdd(data); setAdding(false) }}
            onCancel={() => setAdding(false)}
          />
        )}
        {/* パディング */}
        {(meals.length > 0 || adding) && <div className="h-1" />}
      </div>
    </div>
  )
}

// ─── グラフツールチップ ────────────────────────────────────
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm text-xs">
      <p className="text-gray-400 mb-0.5">{d?.dateLabel}</p>
      <p className="font-bold text-emerald-600">{d?.weight} kg</p>
      <p className="text-gray-400">{d?.timeLabel}</p>
    </div>
  )
}

// ─── カスタムドット ────────────────────────────────────────
function CustomDot(props) {
  const { cx, cy, payload } = props
  return (
    <g>
      {/* 外枠 */}
      <circle cx={cx} cy={cy} r={6} fill="white" stroke="#10b981" strokeWidth={2.5} />
      {/* 内側 */}
      <circle cx={cx} cy={cy} r={3} fill="#10b981" />
    </g>
  )
}

// ─── メインコンポーネント ──────────────────────────────────
export default function RecordPage() {
  const { user, profile } = useAuthStore()
  const {
    userTrainer, weightRecords, todayRecords, consecutiveDays,
    totalPoints, submitting, addWeightRecord, fetchDashboard,
  } = useDashboardStore()

  const [todayMeals, setTodayMeals]     = useState([])
  const [feedback, setFeedback]         = useState(null)
  const [loadingMeals, setLoadingMeals] = useState(true)
  const [activeMealTab, setActiveMealTab] = useState('breakfast')

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!user) return
    if (!userTrainer) fetchDashboard(user.id, profile)
    fetchTodayMeals()
  }, [user?.id])

  // ─── 今日の食事取得 ──────────────────────────────
  const fetchTodayMeals = async () => {
    setLoadingMeals(true)
    const { data } = await supabase
      .from('meal_records')
      .select('id, food_name, calories, protein, fat, carbs, meal_type')
      .eq('user_id', user.id)
      .eq('meal_date', today)
      .order('created_at', { ascending: true })
    setTodayMeals(data ?? [])
    setLoadingMeals(false)
  }

  // ─── 体重記録 ─────────────────────────────────────
  const handleWeightSave = async (timeOfDay, kg) => {
    await addWeightRecord(user.id, timeOfDay, kg)
    showFeedback(`⚖️ ${timeOfDay === 'morning' ? '朝' : '夜'}体重 ${kg}kg を記録しました！`)
  }

  // ─── 食事追加 ─────────────────────────────────────
  const handleAddMeal = async (mealData) => {
    const { error } = await supabase.from('meal_records').insert({
      user_id:      user.id,
      meal_date:    today,
      input_method: 'manual',
      ...mealData,
    })
    if (!error) {
      await supabase.from('point_transactions').insert({
        user_id:     user.id,
        points:      POINTS_PER_MEAL,
        reason:      'meal_record',
        description: mealData.food_name,
      })
      await fetchTodayMeals()
      showFeedback(`🍽 ${mealData.food_name}（${mealData.calories}kcal）を記録！+${POINTS_PER_MEAL}pt`)
    }
  }

  // ─── 食事削除 ─────────────────────────────────────
  const handleDeleteMeal = async (mealId) => {
    await supabase.from('meal_records').delete().eq('id', mealId)
    await fetchTodayMeals()
  }

  const showFeedback = (msg) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3500)
  }

  // ─── 計算値 ───────────────────────────────────────
  const level          = userTrainer?.current_level ?? 1
  const totalCalories  = todayMeals.reduce((s, m) => s + (m.calories || 0), 0)
  const totalProtein   = todayMeals.reduce((s, m) => s + (m.protein  || 0), 0)
  const totalFat       = todayMeals.reduce((s, m) => s + (m.fat      || 0), 0)
  const totalCarbs     = todayMeals.reduce((s, m) => s + (m.carbs    || 0), 0)
  const pfcTotal       = totalProtein + totalFat + totalCarbs
  const pBar           = pfcTotal > 0 ? {
    p: Math.round(totalProtein / pfcTotal * 100),
    f: Math.round(totalFat     / pfcTotal * 100),
    c: Math.round(totalCarbs   / pfcTotal * 100),
  } : null

  const latestWeight = todayRecords.morning?.weight_kg ?? todayRecords.evening?.weight_kg ?? null
  const goalWeight   = profile?.goal_weight ?? null
  const diffToGoal   = latestWeight && goalWeight
    ? Math.round((latestWeight - goalWeight) * 10) / 10
    : null

  // ─── グラフデータ：朝/夜を別点でプロット ──────────
  const graphData = (() => {
    const sorted = [...weightRecords].sort((a, b) => {
      const da = a.recorded_date + (a.time_of_day === 'morning' ? '0' : '1')
      const db = b.recorded_date + (b.time_of_day === 'morning' ? '0' : '1')
      return da.localeCompare(db)
    })
    return sorted.map(r => ({
      key:       r.recorded_date + r.time_of_day,
      dateLabel: new Date(r.recorded_date + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
      timeLabel: r.time_of_day === 'morning' ? '朝' : r.time_of_day === 'evening' ? '夜' : '',
      weight:    r.weight_kg,
      // X軸ラベル：朝は日付のみ、夜は空（同日に2点ある場合に重複防止）
      xLabel:    r.time_of_day === 'morning' ? new Date(r.recorded_date + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : '',
    }))
  })()

  // グラフのY軸domain
  const weights = graphData.map(d => d.weight)
  const minW    = weights.length ? Math.floor(Math.min(...weights) - 1) : 0
  const maxW    = weights.length ? Math.ceil(Math.max(...weights)  + 1) : 100

  const dateLabel = new Date().toLocaleDateString('ja-JP', {
    month: 'long', day: 'numeric', weekday: 'long',
  })

  // タブ別に食事を絞り込み
  const mealsByType = (type) => todayMeals.filter(m => m.meal_type === type)

  return (
    <div className="min-h-dvh bg-gray-50 pb-20">

      {/* フィードバックトースト */}
      {feedback && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-lg animate-fadeSlideUp whitespace-nowrap">
          {feedback}
        </div>
      )}

      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100 px-5 pt-14 pb-4">
        <div className="max-w-sm mx-auto flex items-end justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">{dateLabel}</p>
            <h1 className="text-xl font-bold text-gray-800">今日の記録</h1>
          </div>
          <div className="flex gap-2">
            <div className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-1.5">
              <p className="text-xs font-bold text-orange-500">🔥 {consecutiveDays}日</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5">
              <p className="text-xs font-bold text-emerald-600">Lv.{level}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4 pt-4 space-y-4">

        {/* ══ 体重記録 ═════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-bold text-gray-700">⚖️ 体重記録</h2>
            {goalWeight && (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                diffToGoal === null  ? 'bg-gray-100 text-gray-400'
                : diffToGoal <= 0   ? 'bg-emerald-100 text-emerald-600'
                                    : 'bg-orange-100 text-orange-600'
              }`}>
                {diffToGoal !== null
                  ? diffToGoal <= 0 ? '目標達成🎉' : `目標まで ${diffToGoal}kg`
                  : `目標 ${goalWeight}kg`}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <WeightCard timeOfDay="morning"
              existing={todayRecords.morning?.weight_kg ?? null}
              onSave={handleWeightSave} submitting={submitting} />
            <WeightCard timeOfDay="evening"
              existing={todayRecords.evening?.weight_kg ?? null}
              onSave={handleWeightSave} submitting={submitting} />
          </div>
        </section>

        {/* ══ 体重グラフ ════════════════════════════════ */}
        {graphData.length >= 1 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-600">📈 体重推移（7日）</p>
              {latestWeight && (
                <div className="text-right">
                  <span className="text-base font-bold text-emerald-600">{latestWeight}</span>
                  <span className="text-xs text-gray-400 ml-1">kg</span>
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={graphData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="xLabel"
                  tick={{ fontSize: 9, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                />
                <YAxis
                  domain={[minW, maxW]}
                  tick={{ fontSize: 9, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  tickFormatter={v => `${v}`}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />
                {goalWeight && (
                  <ReferenceLine
                    y={goalWeight}
                    stroke="#10b981"
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                    label={{ value: '目標', position: 'right', fontSize: 9, fill: '#10b981' }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={<CustomDot />}
                  activeDot={{ r: 7, fill: '#059669', stroke: 'white', strokeWidth: 2 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
            {graphData.length === 1 && (
              <p className="text-[10px] text-gray-300 text-center mt-1">2件以上記録するとグラフが繋がります</p>
            )}
          </div>
        )}

        {/* ══ 統計バー ══════════════════════════════════ */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
            <p className="text-lg font-bold text-orange-500">{consecutiveDays}</p>
            <p className="text-[11px] text-gray-400">連続記録</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
            <p className="text-lg font-bold text-emerald-600">{totalPoints.toLocaleString()}</p>
            <p className="text-[11px] text-gray-400">総ポイント</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
            <p className="text-lg font-bold text-blue-600">{level}</p>
            <p className="text-[11px] text-gray-400">レベル</p>
          </div>
        </div>

        {/* ══ 食事記録 ══════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-bold text-gray-700">🍽 食事記録</h2>
            {/* 合計カロリー */}
            {totalCalories > 0 && (
              <span className="text-sm font-bold text-gray-600">
                {totalCalories} <span className="text-xs font-normal text-gray-400">kcal</span>
              </span>
            )}
          </div>

          {/* PFCバー（食事がある場合） */}
          {pBar && (
            <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 mb-3">
              <div className="flex rounded-full overflow-hidden h-2.5 mb-2">
                <div style={{ width: `${pBar.p}%` }} className="bg-blue-400 transition-all" />
                <div style={{ width: `${pBar.f}%` }} className="bg-yellow-400 transition-all" />
                <div style={{ width: `${pBar.c}%` }} className="bg-rose-400 transition-all" />
              </div>
              <div className="flex gap-4 text-[11px] text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-400 rounded-full" />
                  P {Math.round(totalProtein)}g <span className="text-gray-300">({pBar.p}%)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                  F {Math.round(totalFat)}g <span className="text-gray-300">({pBar.f}%)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-rose-400 rounded-full" />
                  C {Math.round(totalCarbs)}g <span className="text-gray-300">({pBar.c}%)</span>
                </span>
              </div>
            </div>
          )}

          {/* 食事タイプ タブナビ */}
          <div className="flex gap-2 mb-3">
            {MEAL_TYPES.map(type => {
              const count    = mealsByType(type.key).length
              const isActive = activeMealTab === type.key
              const c        = COLOR_MAP[type.color]
              return (
                <button
                  key={type.key}
                  onClick={() => setActiveMealTab(type.key)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all relative ${
                    isActive ? `${c.tab} text-white shadow-sm` : 'bg-white border border-gray-100 text-gray-500'
                  }`}
                >
                  <span className="block">{type.emoji}</span>
                  <span className="block text-[10px] mt-0.5">{type.label}</span>
                  {count > 0 && (
                    <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
                      isActive ? 'bg-white text-gray-600' : 'bg-emerald-500 text-white'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* アクティブタブのパネル */}
          {loadingMeals ? (
            <div className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />
          ) : (
            <MealTypePanel
              key={activeMealTab}
              mealType={activeMealTab}
              meals={mealsByType(activeMealTab)}
              onAdd={handleAddMeal}
              onDelete={handleDeleteMeal}
            />
          )}
        </section>

      </div>
      <BottomNav />
    </div>
  )
}
