import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useDashboardStore } from '../stores/dashboardStore'
import { useNotifications } from '../hooks/useNotifications'
import { supabase } from '../lib/supabase'
import { TRAINERS } from '../data/trainers'
import BottomNav from '../components/BottomNav'

// ─── セクションカード ──────────────────────────────────────
function SectionCard({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

// ─── 設定行 ───────────────────────────────────────────────
function SettingRow({ icon, label, value, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-4 text-left active:bg-gray-50 border-b border-gray-50 last:border-0 ${
        danger ? 'text-red-500' : 'text-gray-800'
      }`}
    >
      <span className="text-xl w-8 text-center">{icon}</span>
      <div className="flex-1">
        <p className={`text-sm font-medium ${danger ? 'text-red-500' : 'text-gray-800'}`}>
          {label}
        </p>
        {value && <p className="text-xs text-gray-400 mt-0.5">{value}</p>}
      </div>
      {!danger && <span className="text-gray-300 text-sm">›</span>}
    </button>
  )
}

// ─── プロフィール編集モーダル ──────────────────────────────
function ProfileModal({ profile, onClose, onSaved }) {
  const [username, setUsername] = useState(profile?.username ?? '')
  const [height,   setHeight]   = useState(profile?.height_cm?.toString() ?? '')
  const [goalWeight, setGoalWeight] = useState(profile?.goal_weight?.toString() ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('user_profiles')
      .update({
        username:    username.trim() || null,
        height_cm:   parseFloat(height)    || null,
        goal_weight: parseFloat(goalWeight) || null,
      })
      .eq('id', profile?.id)
    setSaving(false)
    if (!error) onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
      <div className="w-full max-w-sm mx-auto bg-white rounded-t-3xl px-6 pt-5 pb-10 animate-slideUp">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <h3 className="text-base font-bold text-gray-800 mb-5">👤 プロフィール編集</h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">ニックネーム</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="例：たつや"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">身長 (cm)</label>
            <input
              type="number"
              value={height}
              onChange={e => setHeight(e.target.value)}
              placeholder="例：170"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">目標体重 (kg)</label>
            <input
              type="number"
              step="0.1"
              value={goalWeight}
              onChange={e => setGoalWeight(e.target.value)}
              placeholder="例：65.0"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-medium text-gray-600"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white text-sm font-bold disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── トレーナー変更モーダル ────────────────────────────────
function TrainerModal({ currentTrainer, onClose, onSelect }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
      <div className="w-full max-w-sm mx-auto bg-white rounded-t-3xl px-5 pt-5 pb-10 animate-slideUp max-h-[80vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <h3 className="text-base font-bold text-gray-800 mb-4">🔄 トレーナー変更</h3>
        <p className="text-xs text-gray-400 mb-4">変更してもレベルや記録は引き継がれます</p>

        <div className="grid grid-cols-2 gap-3">
          {TRAINERS.map(t => {
            const isCurrent = t.code === currentTrainer?.code
            return (
              <button
                key={t.id}
                onClick={() => !isCurrent && onSelect(t.id)}
                className={`relative rounded-2xl p-4 text-left border-2 transition-all ${
                  isCurrent
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-gray-100 bg-white active:scale-95'
                }`}
              >
                {isCurrent && (
                  <span className="absolute top-2 right-2 text-xs bg-emerald-500 text-white font-bold px-1.5 py-0.5 rounded-full">
                    現在
                  </span>
                )}
                <div className="text-3xl mb-2">{t.emoji}</div>
                <p className="text-sm font-bold text-gray-800">{t.name}</p>
                <p className="text-xs text-gray-400">{t.title}</p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {t.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-3 rounded-2xl border border-gray-200 text-sm font-medium text-gray-600"
        >
          キャンセル
        </button>
      </div>
    </div>
  )
}

// ─── 通知設定モーダル ──────────────────────────────────────
function NotifModal({ settings, saveSettings, toggleNotifications, permission, onClose }) {
  const [morning, setMorning] = useState(`${String(settings.morningHour).padStart(2,'0')}:${String(settings.morningMinute).padStart(2,'0')}`)
  const [evening, setEvening] = useState(`${String(settings.eveningHour).padStart(2,'0')}:${String(settings.eveningMinute).padStart(2,'0')}`)

  const handleSave = () => {
    const [mh, mm] = morning.split(':').map(Number)
    const [eh, em] = evening.split(':').map(Number)
    saveSettings({
      morningHour: mh, morningMinute: mm,
      eveningHour: eh, eveningMinute: em,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
      <div className="w-full max-w-sm mx-auto bg-white rounded-t-3xl px-6 pt-5 pb-10 animate-slideUp">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <h3 className="text-base font-bold text-gray-800 mb-5">🔔 通知設定</h3>

        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-semibold text-gray-800">通知を有効にする</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {permission === 'granted' ? '許可済み' : '未許可（オンにすると許可を求めます）'}
            </p>
          </div>
          <button
            onClick={toggleNotifications}
            className={`w-12 h-6 rounded-full transition-colors ${
              settings.enabled ? 'bg-emerald-500' : 'bg-gray-300'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${
              settings.enabled ? 'translate-x-6' : 'translate-x-0'
            }`} />
          </button>
        </div>

        <div className={`space-y-4 ${!settings.enabled ? 'opacity-40 pointer-events-none' : ''}`}>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">🌅 朝のリマインダー</label>
            <input
              type="time"
              value={morning}
              onChange={e => setMorning(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">🌙 夜のリマインダー</label>
            <input
              type="time"
              value={evening}
              onChange={e => setEvening(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-medium text-gray-600"
          >
            閉じる
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white text-sm font-bold"
          >
            保存する
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── メインコンポーネント ──────────────────────────────────
export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, profile, fetchProfile } = useAuthStore()
  const { trainer, changeTrainer } = useDashboardStore()
  const { permission, settings, saveSettings, toggleNotifications } = useNotifications()

  const [showProfile,  setShowProfile]  = useState(false)
  const [showTrainer,  setShowTrainer]  = useState(false)
  const [showNotif,    setShowNotif]    = useState(false)
  const [loggingOut,   setLoggingOut]   = useState(false)
  const [successMsg,   setSuccessMsg]   = useState(null)

  const showSuccess = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 2500)
  }

  const handleLogout = async () => {
    if (!window.confirm('ログアウトしますか？')) return
    setLoggingOut(true)
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleTrainerSelect = async (trainerId) => {
    setShowTrainer(false)
    if (!user) return
    await changeTrainer(user.id, trainerId)
    showSuccess('トレーナーを変更しました')
  }

  const handleProfileSaved = async () => {
    setShowProfile(false)
    if (user) await fetchProfile(user.id)
    showSuccess('プロフィールを保存しました')
  }

  return (
    <div className="min-h-dvh bg-gray-50 pb-20">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100 px-5 pt-14 pb-5">
        <div className="max-w-sm mx-auto">
          <p className="text-xs text-gray-400 font-medium mb-0.5">FitMentor</p>
          <h1 className="text-xl font-bold text-gray-800">設定</h1>
        </div>
      </div>

      {/* 成功メッセージ */}
      {successMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-lg animate-fadeSlideUp">
          ✓ {successMsg}
        </div>
      )}

      <div className="max-w-sm mx-auto px-4 pt-4 space-y-4">

        {/* プロフィールカード */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-2xl">
            {profile?.username?.[0] ? profile.username[0].toUpperCase() : '😊'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-gray-800 truncate">
              {profile?.username ?? '名前未設定'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
            {profile?.goal_weight && (
              <p className="text-xs text-emerald-600 mt-0.5">目標: {profile.goal_weight}kg</p>
            )}
          </div>
          <button
            onClick={() => setShowProfile(true)}
            className="text-sm text-emerald-600 font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 active:scale-95 transition-transform"
          >
            編集
          </button>
        </div>

        {/* アカウント設定 */}
        <SectionCard>
          <div className="px-4 pt-3 pb-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">アカウント</p>
          </div>
          <SettingRow
            icon={trainer?.emoji ?? '🤖'}
            label="トレーナー変更"
            value={trainer ? `現在: ${trainer.name}（${trainer.title}）` : '未設定'}
            onClick={() => setShowTrainer(true)}
          />
          <SettingRow
            icon="👤"
            label="プロフィール編集"
            value={profile?.username ? `@${profile.username}` : 'ニックネームを設定しよう'}
            onClick={() => setShowProfile(true)}
          />
        </SectionCard>

        {/* 通知 */}
        <SectionCard>
          <div className="px-4 pt-3 pb-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">通知</p>
          </div>
          <SettingRow
            icon="🔔"
            label="リマインダー通知"
            value={settings.enabled
              ? `朝 ${String(settings.morningHour).padStart(2,'0')}:${String(settings.morningMinute).padStart(2,'0')} / 夜 ${String(settings.eveningHour).padStart(2,'0')}:${String(settings.eveningMinute).padStart(2,'0')}`
              : 'オフ'}
            onClick={() => setShowNotif(true)}
          />
        </SectionCard>

        {/* アプリ情報 */}
        <SectionCard>
          <div className="px-4 pt-3 pb-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">アプリ情報</p>
          </div>
          <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-50">
            <span className="text-xl w-8 text-center">📱</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">FitMentor</p>
              <p className="text-xs text-gray-400 mt-0.5">バージョン 1.0.0</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-4">
            <span className="text-xl w-8 text-center">🤖</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">AI エンジン</p>
              <p className="text-xs text-gray-400 mt-0.5">GPT-4o mini powered</p>
            </div>
          </div>
        </SectionCard>

        {/* ログアウト */}
        <SectionCard>
          <SettingRow
            icon="🚪"
            label={loggingOut ? 'ログアウト中...' : 'ログアウト'}
            onClick={handleLogout}
            danger
          />
        </SectionCard>

      </div>

      {/* モーダル */}
      {showProfile && (
        <ProfileModal
          profile={profile}
          onClose={() => setShowProfile(false)}
          onSaved={handleProfileSaved}
        />
      )}
      {showTrainer && (
        <TrainerModal
          currentTrainer={trainer}
          onClose={() => setShowTrainer(false)}
          onSelect={handleTrainerSelect}
        />
      )}
      {showNotif && (
        <NotifModal
          settings={settings}
          saveSettings={saveSettings}
          toggleNotifications={toggleNotifications}
          permission={permission}
          onClose={() => setShowNotif(false)}
        />
      )}

      <BottomNav />
    </div>
  )
}
