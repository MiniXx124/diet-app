import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

const RANK_TABS = [
  { key: 'points', label: '⭐ ポイント' },
  { key: 'streak', label: '🔥 ストリーク' },
]

const RANK_MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function RankingPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('points')
  const [rankings, setRankings] = useState([])
  const [myRank, setMyRank] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    fetchRanking(activeTab)
  }, [activeTab, user?.id])

  const fetchRanking = async (tab) => {
    setLoading(true)
    try {
      if (tab === 'points') {
        const { data, error } = await supabase.rpc('get_leaderboard_points')
        if (error) throw error
        setRankings(data ?? [])
        const my = (data ?? []).find(r => r.user_id === user.id)
        setMyRank(my ?? null)
      } else {
        const { data, error } = await supabase.rpc('get_leaderboard_streak')
        if (error) throw error
        setRankings(data ?? [])
        const my = (data ?? []).find(r => r.user_id === user.id)
        setMyRank(my ?? null)
      }
    } catch {
      setRankings([])
      setMyRank(null)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-dvh bg-gray-50 pb-24">

      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100 px-5 pt-14 pb-0">
        <div className="max-w-sm mx-auto">
          <div className="flex items-center gap-2 pb-3">
            <button onClick={() => navigate('/dashboard')} className="text-gray-400 text-sm hover:text-gray-600">←</button>
            <h1 className="text-gray-900 text-xl font-black">🏆 ランキング</h1>
          </div>
          {/* タブ */}
          <div className="flex">
            {RANK_TABS.map(tab => (
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

        {/* 自分の順位カード */}
        {myRank && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-4">
            <p className="text-white/70 text-xs font-bold mb-1">あなたの順位</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-white text-3xl font-black">
                  {myRank.rank <= 3 ? RANK_MEDAL[myRank.rank] : `#${myRank.rank}`}
                </span>
                <div>
                  <p className="text-white font-black text-base">{myRank.nickname ?? 'あなた'}</p>
                  <p className="text-white/70 text-xs">
                    {activeTab === 'points'
                      ? `${(myRank.total_points ?? 0).toLocaleString()} pt`
                      : `${myRank.streak ?? 0} 日連続`}
                  </p>
                </div>
              </div>
              <span className="text-white/60 text-sm">Lv.{myRank.level ?? 1}</span>
            </div>
          </div>
        )}

        {/* ランキングリスト */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <h2 className="text-gray-900 font-black text-sm">
              {activeTab === 'points' ? '⭐ ポイントランキング TOP50' : '🔥 ストリークランキング TOP50'}
            </h2>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rankings.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-4xl mb-2">🏆</p>
              <p className="text-gray-400 text-sm font-bold">まだランキングがありません</p>
              <p className="text-gray-300 text-xs mt-1">体重を記録してポイントを貯めよう</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {rankings.map((row) => {
                const isMe = row.user_id === user.id
                return (
                  <div
                    key={row.user_id}
                    className={`px-4 py-3 flex items-center gap-3 ${isMe ? 'bg-blue-50' : ''}`}
                  >
                    {/* 順位 */}
                    <div className="w-8 text-center flex-shrink-0">
                      {row.rank <= 3 ? (
                        <span className="text-xl">{RANK_MEDAL[row.rank]}</span>
                      ) : (
                        <span className="text-gray-400 text-sm font-black">#{row.rank}</span>
                      )}
                    </div>

                    {/* ユーザー情報 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={`font-black text-sm truncate ${isMe ? 'text-blue-700' : 'text-gray-800'}`}>
                          {row.nickname ?? `ユーザー${row.rank}`}
                          {isMe && <span className="text-blue-400 text-xs font-normal ml-1">（あなた）</span>}
                        </p>
                      </div>
                      <p className="text-gray-400 text-xs">Lv.{row.level ?? 1}</p>
                    </div>

                    {/* スコア */}
                    <div className="text-right flex-shrink-0">
                      {activeTab === 'points' ? (
                        <p className={`font-black text-base ${isMe ? 'text-blue-600' : 'text-gray-700'}`}>
                          {(row.total_points ?? 0).toLocaleString()}
                          <span className="text-xs font-normal text-gray-400 ml-0.5">pt</span>
                        </p>
                      ) : (
                        <p className={`font-black text-base ${isMe ? 'text-blue-600' : 'text-gray-700'}`}>
                          {row.streak ?? 0}
                          <span className="text-xs font-normal text-gray-400 ml-0.5">日</span>
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      <BottomNav />
    </div>
  )
}
