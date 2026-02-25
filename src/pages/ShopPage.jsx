import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useDashboardStore } from '../stores/dashboardStore'
import { supabase } from '../lib/supabase'
import { SHOP_ITEMS, CATEGORY_LABELS_SHOP } from '../data/shopItems'
import BottomNav from '../components/BottomNav'

export default function ShopPage() {
  const { user } = useAuthStore()
  const { totalPoints, fetchPoints } = useDashboardStore()

  const [purchases, setPurchases] = useState(new Map()) // item_id → count
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(null)   // 購入中のitem_id
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    loadAll()
  }, [user?.id])

  const loadAll = async () => {
    setLoading(true)
    await fetchPoints(user.id)
    await fetchPurchases()
    setLoading(false)
  }

  const fetchPurchases = async () => {
    const { data } = await supabase
      .from('user_purchases')
      .select('item_id')
      .eq('user_id', user.id)
      .is('used_at', null)   // 未使用のみカウント

    const countMap = new Map()
    for (const row of data ?? []) {
      countMap.set(row.item_id, (countMap.get(row.item_id) ?? 0) + 1)
    }
    setPurchases(countMap)
  }

  const handleBuy = async (item) => {
    if (totalPoints < item.price) {
      showToast('ポイントが足りません', 'error')
      return
    }
    const owned = purchases.get(item.id) ?? 0
    if (owned >= item.maxOwn) {
      showToast('これ以上購入できません', 'error')
      return
    }

    setBuying(item.id)
    try {
      // ポイント消費（マイナストランザクション）
      const { error: ptErr } = await supabase.from('point_transactions').insert({
        user_id:     user.id,
        points:      -item.price,
        reason:      'shop_purchase',
        description: `${item.name}を購入`,
      })
      if (ptErr) throw ptErr

      // 即時効果アイテム（ポイントパック）
      if (item.immediate && item.id === 'bonus_points') {
        await supabase.from('point_transactions').insert({
          user_id:     user.id,
          points:      500,
          reason:      'bonus_pack',
          description: 'ポイントパックボーナス',
        })
      }

      // 購入記録
      await supabase.from('user_purchases').insert({
        user_id: user.id,
        item_id: item.id,
      })

      await loadAll()
      showToast(`${item.emoji} ${item.name}を購入しました！`, 'success')
    } catch {
      showToast('購入に失敗しました', 'error')
    } finally {
      setBuying(null)
    }
  }

  const showToast = (msg, type) => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const categories = Object.keys(CATEGORY_LABELS_SHOP)

  return (
    <div className="min-h-dvh bg-gray-50 pb-24">

      {/* トースト */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-bold transition-all ${
          toast.type === 'success'
            ? 'bg-blue-600 text-white'
            : 'bg-red-500 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100 px-5 pt-14 pb-4">
        <div className="max-w-sm mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 text-xl font-black">🛍️ ポイントショップ</h1>
            <p className="text-gray-400 text-xs mt-0.5">貯めたポイントで特典をゲット</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-2 text-right">
            <p className="text-blue-400 text-[10px] font-bold">所持ポイント</p>
            <p className="text-blue-600 text-xl font-black">{totalPoints.toLocaleString()}<span className="text-xs font-normal ml-0.5">pt</span></p>
          </div>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4 pt-4 space-y-4">

        {/* インベントリ */}
        {(() => {
          const owned = SHOP_ITEMS.filter(item => (purchases.get(item.id) ?? 0) > 0)
          if (owned.length === 0) return null
          return (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <h2 className="text-gray-900 font-black text-sm">🎒 インベントリ</h2>
              </div>
              <div className="p-3 flex flex-wrap gap-2">
                {owned.map(item => (
                  <div key={item.id} className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                    <span className="text-lg">{item.emoji}</span>
                    <div>
                      <p className="text-blue-700 text-xs font-black">{item.name}</p>
                      <p className="text-blue-400 text-[10px]">× {purchases.get(item.id)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* カテゴリ別ショップ */}
        {categories.map(cat => {
          const items = SHOP_ITEMS.filter(i => i.category === cat)
          return (
            <div key={cat} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <h2 className="text-gray-900 font-black text-sm">{CATEGORY_LABELS_SHOP[cat]}</h2>
              </div>
              <div className="p-3 space-y-2">
                {items.map(item => {
                  const owned = purchases.get(item.id) ?? 0
                  const canBuy = totalPoints >= item.price && owned < item.maxOwn
                  const soldOut = owned >= item.maxOwn
                  const isBuying = buying === item.id

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 rounded-xl p-3 border ${
                        soldOut ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-100'
                      }`}
                    >
                      {/* アイコン */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
                        soldOut ? 'bg-gray-100' : 'bg-gradient-to-br from-blue-50 to-indigo-50'
                      }`}>
                        <span className={soldOut ? 'grayscale opacity-40' : ''}>{item.emoji}</span>
                      </div>

                      {/* テキスト */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-black text-sm ${soldOut ? 'text-gray-400' : 'text-gray-900'}`}>
                            {item.name}
                          </p>
                          {owned > 0 && (
                            <span className="text-[9px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                              所持×{owned}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-0.5 leading-relaxed ${soldOut ? 'text-gray-300' : 'text-gray-400'}`}>
                          {item.description}
                        </p>
                      </div>

                      {/* 購入ボタン */}
                      <div className="shrink-0 text-right">
                        <p className={`text-xs font-black mb-1 ${canBuy ? 'text-blue-600' : 'text-gray-400'}`}>
                          {item.price.toLocaleString()}pt
                        </p>
                        {soldOut ? (
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">
                            所持済み
                          </span>
                        ) : (
                          <button
                            onClick={() => handleBuy(item)}
                            disabled={!canBuy || isBuying}
                            className={`text-xs font-black px-3 py-1.5 rounded-lg transition-all active:scale-95 ${
                              canBuy
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {isBuying ? '...' : '購入'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        <p className="text-gray-300 text-xs text-center pb-2">
          アイテムは随時追加予定
        </p>
      </div>

      <BottomNav />
    </div>
  )
}
