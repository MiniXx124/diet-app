import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useDashboardStore } from '../stores/dashboardStore'
import { ACHIEVEMENTS, CATEGORY_LABELS } from '../data/achievements'
import BottomNav from '../components/BottomNav'

export default function AchievementsPage() {
  const { user, profile } = useAuthStore()
  const {
    unlockedAchievementIds,
    weightRecords, consecutiveDays, totalPoints, userTrainer,
    fetchDashboard,
    checkAchievements,
  } = useDashboardStore()

  useEffect(() => {
    if (!user?.id) return
    // ダッシュボードデータがまだない場合はフェッチ
    if (!userTrainer) {
      fetchDashboard(user.id, profile)
    } else {
      checkAchievements(user.id, profile)
    }
  }, [user?.id])

  const unlockedSet = new Set(unlockedAchievementIds)
  const unlockedCount = unlockedAchievementIds.length
  const totalCount = ACHIEVEMENTS.length

  // カテゴリ順に整理
  const categories = Object.keys(CATEGORY_LABELS)

  return (
    <div className="min-h-dvh bg-gray-50 pb-24">

      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100 px-5 pt-14 pb-4">
        <div className="max-w-sm mx-auto">
          <h1 className="text-gray-900 text-xl font-black">🏅 アチーブメント</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all duration-700"
                style={{ width: `${totalCount ? (unlockedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
            <span className="text-gray-500 text-xs font-bold shrink-0">
              {unlockedCount} / {totalCount}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4 pt-4 space-y-4">

        {categories.map(cat => {
          const items = ACHIEVEMENTS.filter(a => a.category === cat)
          const catUnlocked = items.filter(a => unlockedSet.has(a.id)).length

          return (
            <div key={cat} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {/* カテゴリヘッダー */}
              <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                <h2 className="text-gray-900 font-black text-sm">{CATEGORY_LABELS[cat]}</h2>
                <span className="text-gray-400 text-xs font-bold">
                  {catUnlocked}/{items.length}
                </span>
              </div>

              {/* バッジグリッド */}
              <div className="p-3 grid grid-cols-1 gap-2">
                {items.map(ach => {
                  const unlocked = unlockedSet.has(ach.id)
                  return (
                    <div
                      key={ach.id}
                      className={`flex items-center gap-3 rounded-xl p-3 transition-all ${
                        unlocked
                          ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-100'
                          : 'bg-gray-50 border border-gray-100'
                      }`}
                    >
                      {/* アイコン */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
                        unlocked ? 'bg-white shadow-sm' : 'bg-gray-100'
                      }`}>
                        <span className={unlocked ? '' : 'grayscale opacity-30'}>
                          {ach.emoji}
                        </span>
                      </div>

                      {/* テキスト */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-black text-sm ${unlocked ? 'text-gray-900' : 'text-gray-400'}`}>
                          {ach.title}
                        </p>
                        <p className={`text-xs mt-0.5 ${unlocked ? 'text-gray-500' : 'text-gray-300'}`}>
                          {ach.description}
                        </p>
                      </div>

                      {/* ステータス */}
                      {unlocked ? (
                        <div className="shrink-0 w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
                          <span className="text-white text-xs font-black">✓</span>
                        </div>
                      ) : (
                        <div className="shrink-0 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-300 text-xs font-black">🔒</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

      </div>

      <BottomNav />
    </div>
  )
}
