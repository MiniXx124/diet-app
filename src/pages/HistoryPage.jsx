import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

// ─── 体重ヘルパー ─────────────────────────────────────────────────
function buildWeightChart(records) {
  const sorted = [...records].sort((a, b) =>
    a.recorded_date.localeCompare(b.recorded_date) || (a.time_of_day === 'morning' ? -1 : 1)
  )
  return sorted.map(r => {
    const d = new Date(r.recorded_date)
    const suffix = r.time_of_day === 'morning' ? '朝' : '夜'
    return { date: `${d.getMonth()+1}/${d.getDate()}${suffix}`, 体重: parseFloat(r.weight_kg) }
  })
}

function groupWeightByDate(records) {
  const map = new Map()
  for (const r of records) {
    if (!map.has(r.recorded_date)) map.set(r.recorded_date, { morning: null, evening: null })
    const entry = map.get(r.recorded_date)
    if (r.time_of_day === 'morning') entry.morning = parseFloat(r.weight_kg)
    else entry.evening = parseFloat(r.weight_kg)
  }
  const dates = [...map.keys()].sort((a, b) => b.localeCompare(a))
  const DAYS_JP = '日月火水木金土'
  return dates.map((date, i) => {
    const { morning, evening } = map.get(date)
    const d = new Date(date)
    const label = `${d.getMonth()+1}月${d.getDate()}日（${DAYS_JP[d.getDay()]}）`
    const currentLatest = evening ?? morning
    let diff = null
    if (i < dates.length - 1) {
      const prevDay = map.get(dates[i + 1])
      const prevLatest = prevDay.evening ?? prevDay.morning
      if (currentLatest !== null && prevLatest !== null)
        diff = parseFloat((currentLatest - prevLatest).toFixed(1))
    }
    return { date, label, morning, evening, diff }
  })
}

// ─── 体型測定ヘルパー ─────────────────────────────────────────────
function buildBodyChart(measurements) {
  return [...measurements]
    .sort((a, b) => a.recorded_date.localeCompare(b.recorded_date))
    .map(m => {
      const d = new Date(m.recorded_date)
      return {
        date: `${d.getMonth()+1}/${d.getDate()}`,
        ウエスト: m.waist_cm ? parseFloat(m.waist_cm) : null,
        体脂肪率: m.body_fat_pct ? parseFloat(m.body_fat_pct) : null,
      }
    })
}

export default function HistoryPage() {
  const { user } = useAuthStore()
  const today = new Date().toISOString().split('T')[0]

  const [activeTab, setActiveTab] = useState('weight')

  // 体重
  const [weightRecords, setWeightRecords] = useState([])
  const [weightLoading, setWeightLoading]   = useState(true)

  // 体型測定
  const [measurements, setMeasurements]       = useState([])
  const [bodyLoading, setBodyLoading]         = useState(true)
  const [waistInput, setWaistInput]           = useState('')
  const [fatInput, setFatInput]               = useState('')
  const [bodySubmitting, setBodySubmitting]   = useState(false)
  const [toast, setToast]                     = useState(null)
  const [todayMeasurement, setTodayMeasurement] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    fetchWeightHistory()
    fetchBodyMeasurements()
  }, [user?.id])

  // ── 体重履歴 ─────────────────────────────────────────────────────
  const fetchWeightHistory = async () => {
    setWeightLoading(true)
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 89)
    const { data } = await supabase
      .from('weight_records')
      .select('id, recorded_date, time_of_day, weight_kg')
      .eq('user_id', user.id)
      .gte('recorded_date', fromDate.toISOString().split('T')[0])
      .order('recorded_date', { ascending: false })
    setWeightRecords(data ?? [])
    setWeightLoading(false)
  }

  // ── 体型測定 ──────────────────────────────────────────────────────
  const fetchBodyMeasurements = async () => {
    setBodyLoading(true)
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 89)
    const { data } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', user.id)
      .gte('recorded_date', fromDate.toISOString().split('T')[0])
      .order('recorded_date', { ascending: false })
    const list = data ?? []
    setMeasurements(list)
    const todayRec = list.find(m => m.recorded_date === today)
    setTodayMeasurement(todayRec ?? null)
    if (todayRec) {
      setWaistInput(todayRec.waist_cm ?? '')
      setFatInput(todayRec.body_fat_pct ?? '')
    }
    setBodyLoading(false)
  }

  const handleBodySave = async (e) => {
    e.preventDefault()
    if (!waistInput && !fatInput) { showToast('ウエストか体脂肪率を入力してください', 'error'); return }
    setBodySubmitting(true)
    try {
      const payload = {
        user_id: user.id,
        recorded_date: today,
        waist_cm: waistInput ? parseFloat(waistInput) : null,
        body_fat_pct: fatInput ? parseFloat(fatInput) : null,
      }
      if (todayMeasurement) {
        await supabase.from('body_measurements').update(payload).eq('id', todayMeasurement.id)
      } else {
        await supabase.from('body_measurements').insert(payload)
      }
      await fetchBodyMeasurements()
      showToast('記録しました！', 'success')
    } catch {
      showToast('保存に失敗しました', 'error')
    } finally {
      setBodySubmitting(false)
    }
  }

  const showToast = (msg, type) => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── 体重統計 ──────────────────────────────────────────────────────
  const weights = weightRecords.map(r => parseFloat(r.weight_kg))
  const recordedDates = new Set(weightRecords.map(r => r.recorded_date))
  const avgWeight = weights.length ? (weights.reduce((a,b)=>a+b,0)/weights.length).toFixed(1) : null
  const minWeight = weights.length ? Math.min(...weights).toFixed(1) : null
  const sortedW = [...weightRecords].sort((a,b)=>a.recorded_date.localeCompare(b.recorded_date)||(a.time_of_day==='morning'?-1:1))
  const totalChange = sortedW.length >= 2
    ? parseFloat((parseFloat(sortedW[sortedW.length-1].weight_kg) - parseFloat(sortedW[0].weight_kg)).toFixed(1))
    : null

  const weightChartData = buildWeightChart(weightRecords)
  const groupedWeight   = groupWeightByDate(weightRecords)

  // ── 体型測定統計 ──────────────────────────────────────────────────
  const waistData = measurements.filter(m => m.waist_cm)
  const fatData   = measurements.filter(m => m.body_fat_pct)
  const latestWaist = waistData[0]?.waist_cm ?? null
  const latestFat   = fatData[0]?.body_fat_pct ?? null
  const waistChange = waistData.length >= 2
    ? parseFloat((parseFloat(waistData[0].waist_cm) - parseFloat(waistData[waistData.length-1].waist_cm)).toFixed(1))
    : null
  const fatChange = fatData.length >= 2
    ? parseFloat((parseFloat(fatData[0].body_fat_pct) - parseFloat(fatData[fatData.length-1].body_fat_pct)).toFixed(1))
    : null

  const bodyChartData   = buildBodyChart(measurements)
  const DAYS_JP = '日月火水木金土'

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
      <div className="bg-white border-b border-gray-100 px-5 pt-14 pb-0">
        <div className="max-w-sm mx-auto">
          <h1 className="text-gray-900 text-xl font-black pb-3">📋 記録履歴</h1>
          {/* タブ */}
          <div className="flex">
            {[
              { key: 'weight', label: '⚖️ 体重' },
              { key: 'body',   label: '📏 体型測定' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2.5 text-sm font-black border-b-2 transition-all ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4 pt-4 space-y-3">

        {/* ══════════════ 体重タブ ══════════════ */}
        {activeTab === 'weight' && (
          <>
            {weightLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* 統計 */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '記録日数', value: recordedDates.size, unit: '日', color: 'text-gray-900' },
                    { label: '平均', value: avgWeight ?? '-', unit: 'kg', color: 'text-blue-600' },
                    { label: '最低', value: minWeight ?? '-', unit: 'kg', color: 'text-green-600' },
                    {
                      label: '変化量',
                      value: totalChange === null ? '-' : totalChange > 0 ? `+${totalChange}` : totalChange,
                      unit: 'kg',
                      color: totalChange === null ? 'text-gray-300' : totalChange < 0 ? 'text-green-600' : totalChange > 0 ? 'text-red-400' : 'text-gray-400'
                    },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
                      <p className="text-gray-400 text-[9px] font-bold mb-1">{s.label}</p>
                      <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                      <p className="text-gray-400 text-[9px]">{s.unit}</p>
                    </div>
                  ))}
                </div>

                {/* グラフ */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <h2 className="text-gray-900 font-black text-sm mb-3">📈 体重推移（90日）</h2>
                  {weightChartData.length === 0 ? (
                    <div className="h-36 flex items-center justify-center">
                      <p className="text-gray-300 text-sm">記録がありません</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={weightChartData} margin={{ top:5, right:5, left:-25, bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="date" tick={{ fontSize:9, fill:'#9ca3af' }} axisLine={false} tickLine={false}
                          interval={Math.max(0, Math.floor(weightChartData.length/5))} />
                        <YAxis tick={{ fontSize:10, fill:'#9ca3af' }} axisLine={false} tickLine={false} domain={['auto','auto']} />
                        <Tooltip formatter={(v)=>[`${v} kg`,'体重']}
                          contentStyle={{ fontSize:12, borderRadius:10, border:'1px solid #e5e7eb' }} />
                        <Line type="monotone" dataKey="体重" stroke="#3b82f6" strokeWidth={2}
                          dot={weightChartData.length<=20 ? { r:3, fill:'#3b82f6', stroke:'#fff', strokeWidth:2 } : false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* 日別リスト */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50">
                    <h2 className="text-gray-900 font-black text-sm">📅 日別記録</h2>
                  </div>
                  {groupedWeight.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-gray-300 text-sm">記録がありません</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {groupedWeight.map(({ date, label, morning, evening, diff }) => (
                        <div key={date} className="px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-gray-700 font-bold text-sm">{label}</p>
                            <div className="flex gap-3 mt-1">
                              {morning !== null && <span className="text-gray-500 text-xs">☀️ <span className="font-bold text-gray-700">{morning}kg</span></span>}
                              {evening !== null && <span className="text-gray-500 text-xs">🌙 <span className="font-bold text-gray-700">{evening}kg</span></span>}
                            </div>
                          </div>
                          {diff !== null ? (
                            <span className={`text-sm font-black px-2 py-0.5 rounded-lg ${
                              diff < 0 ? 'bg-green-50 text-green-600' : diff > 0 ? 'bg-red-50 text-red-400' : 'bg-gray-50 text-gray-400'
                            }`}>
                              {diff > 0 ? `+${diff}` : diff}
                            </span>
                          ) : (
                            <span className="text-gray-200 text-xs">初日</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ══════════════ 体型測定タブ ══════════════ */}
        {activeTab === 'body' && (
          <>
            {/* 入力フォーム */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-gray-900 font-black text-sm">📏 今日の測定</h2>
                {todayMeasurement && (
                  <span className="text-green-500 text-xs font-bold bg-green-50 px-2 py-0.5 rounded-full">✓ 記録済み</span>
                )}
              </div>
              <form onSubmit={handleBodySave} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-500 text-xs font-bold block mb-1">ウエスト (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={waistInput}
                      onChange={e => setWaistInput(e.target.value)}
                      placeholder="例: 78.5"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs font-bold block mb-1">体脂肪率 (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={fatInput}
                      onChange={e => setFatInput(e.target.value)}
                      placeholder="例: 22.5"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={bodySubmitting}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-black disabled:opacity-40 transition-all active:scale-[0.98]"
                >
                  {bodySubmitting ? '保存中...' : todayMeasurement ? '今日の測定を更新' : '今日の測定を記録'}
                </button>
              </form>
            </div>

            {bodyLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* 統計カード */}
                {measurements.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                      <p className="text-gray-400 text-[10px] font-bold mb-1">現在のウエスト</p>
                      <p className="text-gray-900 text-2xl font-black">{latestWaist ?? '-'}</p>
                      <p className="text-gray-400 text-xs">cm</p>
                      {waistChange !== null && (
                        <p className={`text-xs font-bold mt-1 ${waistChange < 0 ? 'text-green-500' : waistChange > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                          {waistChange > 0 ? `+${waistChange}` : waistChange}cm (90日)
                        </p>
                      )}
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                      <p className="text-gray-400 text-[10px] font-bold mb-1">現在の体脂肪率</p>
                      <p className="text-gray-900 text-2xl font-black">{latestFat ?? '-'}</p>
                      <p className="text-gray-400 text-xs">%</p>
                      {fatChange !== null && (
                        <p className={`text-xs font-bold mt-1 ${fatChange < 0 ? 'text-green-500' : fatChange > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                          {fatChange > 0 ? `+${fatChange}` : fatChange}% (90日)
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* グラフ */}
                {bodyChartData.length >= 2 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <h2 className="text-gray-900 font-black text-sm mb-3">📈 体型推移（90日）</h2>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={bodyChartData} margin={{ top:5, right:5, left:-20, bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="date" tick={{ fontSize:9, fill:'#9ca3af' }} axisLine={false} tickLine={false}
                          interval={Math.max(0, Math.floor(bodyChartData.length/5))} />
                        <YAxis tick={{ fontSize:9, fill:'#9ca3af' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize:11, borderRadius:10, border:'1px solid #e5e7eb' }} />
                        {waistData.length > 0 && (
                          <Line type="monotone" dataKey="ウエスト" stroke="#3b82f6" strokeWidth={2}
                            dot={bodyChartData.length<=20 ? { r:3, fill:'#3b82f6', stroke:'#fff', strokeWidth:2 } : false}
                            connectNulls={false} />
                        )}
                        {fatData.length > 0 && (
                          <Line type="monotone" dataKey="体脂肪率" stroke="#f97316" strokeWidth={2}
                            dot={bodyChartData.length<=20 ? { r:3, fill:'#f97316', stroke:'#fff', strokeWidth:2 } : false}
                            connectNulls={false} />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-2 justify-center">
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <span className="w-3 h-0.5 bg-blue-500 inline-block rounded" /> ウエスト(cm)
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <span className="w-3 h-0.5 bg-orange-400 inline-block rounded" /> 体脂肪率(%)
                      </span>
                    </div>
                  </div>
                )}

                {/* 履歴リスト */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50">
                    <h2 className="text-gray-900 font-black text-sm">📅 測定履歴</h2>
                  </div>
                  {measurements.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-4xl mb-2">📏</p>
                      <p className="text-gray-400 text-sm font-bold">測定データがありません</p>
                      <p className="text-gray-300 text-xs mt-1">上のフォームから記録しよう</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {measurements.map(m => {
                        const d = new Date(m.recorded_date)
                        const label = `${d.getMonth()+1}月${d.getDate()}日（${DAYS_JP[d.getDay()]}）`
                        return (
                          <div key={m.id} className="px-4 py-3 flex items-center justify-between">
                            <p className="text-gray-700 font-bold text-sm">{label}</p>
                            <div className="flex gap-3 text-xs text-gray-500">
                              {m.waist_cm && <span>ウエスト <span className="font-black text-gray-800">{m.waist_cm}cm</span></span>}
                              {m.body_fat_pct && <span>体脂肪 <span className="font-black text-gray-800">{m.body_fat_pct}%</span></span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

      </div>

      <BottomNav />
    </div>
  )
}
