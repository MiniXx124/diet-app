export default function Skeleton({ className = '' }) {
  return <div className={`bg-gray-200 rounded-xl animate-pulse ${className}`} />
}

// ダッシュボード用スケルトン
export function DashboardSkeleton() {
  return (
    <div className="min-h-dvh bg-gray-50 pb-20">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100 px-5 pt-14 pb-5">
        <div className="max-w-sm mx-auto flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-40" />
          </div>
          <Skeleton className="h-10 w-16" />
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4 pt-4 space-y-3">
        {/* トレーナーカード */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-14 h-14 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="w-10 h-10 rounded-full" />
          </div>
          <Skeleton className="h-2 w-full" />
          <div className="flex gap-2">
            <Skeleton className="w-7 h-7 rounded-lg" />
            <Skeleton className="h-12 flex-1 rounded-xl" />
          </div>
        </div>

        {/* 体重カード */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>

        {/* グラフカード */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  )
}
