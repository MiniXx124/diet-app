import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useDashboardStore } from '../stores/dashboardStore'
import { supabase } from '../lib/supabase'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import BottomNav from '../components/BottomNav'

// ─── 過去セッション一覧 ────────────────────────────────────
function SessionCard({ session, trainerEmoji, index, isPremiumLocked }) {
  const [open, setOpen] = useState(false)
  const date = new Date(session.created_at)
  const label = date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })
  const msgCount = session.messages?.length ?? 0

  if (isPremiumLocked) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4 opacity-60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-lg">🔒</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-400">{label} のチャット</p>
            <p className="text-xs text-gray-300 mt-0.5">プレミアムプランで閲覧可能</p>
          </div>
          <span className="text-xs bg-amber-100 text-amber-600 font-bold px-2.5 py-1 rounded-full">
            Premium
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-4 active:bg-gray-50"
      >
        <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-lg shrink-0">
          {trainerEmoji ?? '🤖'}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-gray-800">{label} のチャット</p>
          <p className="text-xs text-gray-400 mt-0.5">{msgCount}件のメッセージ</p>
        </div>
        <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && session.messages?.length > 0 && (
        <div className="border-t border-gray-50 px-4 pb-4 pt-3 space-y-2.5 max-h-80 overflow-y-auto">
          {session.messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-emerald-500 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-700 rounded-bl-sm'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── カスタムツールチップ ──────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-emerald-600">{payload[0].value} kg</p>
    </div>
  )
}

// ─── メインコンポーネント ──────────────────────────────────
const FREE_SESSION_LIMIT = 5

export default function ChallengePage() {
  const { user } = useAuthStore()
  const { trainer, userTrainer, consecutiveDays } = useDashboardStore()

  const [weightData, setWeightData] = useState([])
  const [sessions, setSessions] = useState([])
  const [loadingWeight, setLoadingWeight] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchWeightHistory()
    fetchSessions()
  }, [user?.id])

  // ─── 90日の体重履歴 ─────────────────────────────────
  const fetchWeightHistory = async () => {
    setLoadingWeight(true)
    const from = new Date()
    from.setDate(from.getDate() - 89)
    const fromStr = from.toISOString().split('T')[0]

    const { data } = await supabase
      .from('weight_records')
      .select('recorded_date, weight_kg, time_of_day')
      .eq('user_id', user.id)
      .gte('recorded_date', fromStr)
      .order('recorded_date', { ascending: true })
      .order('time_of_day', { ascending: true })

    if (data) {
      // 同日複数記録は平均
      const byDate = {}
      for (const r of data) {
        if (!byDate[r.recorded_date]) byDate[r.recorded_date] = []
        byDate[r.recorded_date].push(r.weight_kg)
      }
      const chart = Object.entries(byDate).map(([date, vals]) => ({
        date,
        label: new Date(date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
        weight: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
      }))
      setWeightData(chart)
    }
    setLoadingWeight(false)
  }

  // ─── チャット履歴セッション ──────────────────────────
  const fetchSessions = async () => {
    setLoadingSessions(true)
    try {
      const { data: rows } = await supabase
        .from('chat_messages')
        .select('session_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!rows?.length) {
        setLoadingSessions(false)
        return
      }

      // ユニークセッション（最大10件取得・5件無料表示）
      const seen = new Set()
      const sessionInfos = []
      for (const row of rows) {
        if (!seen.has(row.session_id)) {
          seen.add(row.session_id)
          sessionInfos.push({ id: row.session_id, created_at: row.created_at })
          if (sessionInfos.length >= 10) break
        }
      }

      // 各セッションのメッセージ取得（無料分のみ）
      const loadedSessions = await Promise.all(
        sessionInfos.slice(0, FREE_SESSION_LIMIT).map(async (s) => {
          const { data: msgs } = await supabase
            .from('chat_messages')
            .select('role, content')
            .eq('user_id', user.id)
            .eq('session_id', s.id)
            .order('created_at', { ascending: true })
          return { session_id: s.id, created_at: s.created_at, messages: msgs ?? [] }
        })
      )

      // 残りはロックされたカード用に枠だけ追加
      const lockedSessions = sessionInfos.slice(FREE_SESSION_LIMIT).map(s => ({
        session_id: s.id,
        created_at: s.created_at,
        messages: [],
        locked: true,
      }))

      setSessions([...loadedSessions, ...lockedSessions])
    } catch (e) {
      console.warn('Sessions load error:', e.message)
    }
    setLoadingSessions(false)
  }

  // ─── 統計計算 ─────────────────────────────────────
  const latestWeight = weightData.length > 0 ? weightData[weightData.length - 1].weight : null
  const firstWeight  = weightData.length > 0 ? weightData[0].weight : null
  const weightChange = latestWeight && firstWeight
    ? Math.round((latestWeight - firstWeight) * 10) / 10
    : null

  const minWeight = weightData.length > 0 ? Math.min(...weightData.map(d => d.weight)) : null
  const maxWeight = weightData.length > 0 ? Math.max(...weightData.map(d => d.weight)) : null

  return (
    <div className="min-h-dvh bg-gray-50 pb-20">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100 px-5 pt-14 pb-5">
        <div className="max-w-sm mx-auto">
          <p className="text-xs text-gray-400 font-medium mb-0.5">チャレンジ記録</p>
          <h1 className="text-xl font-bold text-gray-800">チャレンジ歴</h1>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4 pt-4 space-y-4">

        {/* ストリーク + 統計 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{consecutiveDays}</div>
            <div className="text-xs text-gray-400 mt-0.5">連続日数</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{userTrainer?.current_level ?? 1}</div>
            <div className="text-xs text-gray-400 mt-0.5">レベル</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <div className={`text-2xl font-bold ${weightChange !== null ? (weightChange < 0 ? 'text-emerald-600' : weightChange > 0 ? 'text-red-500' : 'text-gray-600') : 'text-gray-300'}`}>
              {weightChange !== null ? (weightChange > 0 ? `+${weightChange}` : `${weightChange}`) : '--'}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">体重変化(kg)</div>
          </div>
        </div>

        {/* 体重グラフ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-700">📈 体重グラフ（90日）</h2>
            {latestWeight && (
              <span className="text-lg font-bold text-emerald-600">{latestWeight} kg</span>
            )}
          </div>

          {loadingWeight ? (
            <div className="h-40 bg-gray-50 rounded-xl animate-pulse" />
          ) : weightData.length < 2 ? (
            <div className="h-40 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl mb-2">📊</div>
                <p className="text-sm text-gray-400">記録が2件以上になると<br />グラフが表示されます</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.floor(weightData.length / 5)}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `${v}`}
                  width={32}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}

          {minWeight && maxWeight && (
            <div className="flex justify-between mt-2">
              <div className="text-xs text-gray-400">最低 <span className="font-semibold text-gray-600">{minWeight}kg</span></div>
              <div className="text-xs text-gray-400">最高 <span className="font-semibold text-gray-600">{maxWeight}kg</span></div>
            </div>
          )}
        </div>

        {/* チャット履歴 */}
        <div>
          <h2 className="text-sm font-bold text-gray-700 mb-3">💬 チャット履歴</h2>
          {loadingSessions ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-white rounded-2xl border border-gray-100 animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <div className="text-3xl mb-2">💬</div>
              <p className="text-sm text-gray-400">チャット履歴はまだありません</p>
              <p className="text-xs text-gray-300 mt-1">マイトレーナーで会話してみよう</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s, i) => (
                <SessionCard
                  key={s.session_id}
                  session={s}
                  trainerEmoji={trainer?.emoji}
                  index={i}
                  isPremiumLocked={!!s.locked}
                />
              ))}
            </div>
          )}
        </div>

      </div>

      <BottomNav />
    </div>
  )
}
