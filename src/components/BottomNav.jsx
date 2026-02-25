import { useLocation, useNavigate } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/dashboard', icon: '🏠', label: 'トレーナー' },
  { path: '/record',    icon: '📝', label: '記録' },
  { path: '/settings',  icon: '⚙️', label: '設定' },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 z-40"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-sm mx-auto flex">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${
                active ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
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
