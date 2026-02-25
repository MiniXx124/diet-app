import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Spinner from './components/ui/Spinner'

import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import AuthCallbackPage from './pages/auth/AuthCallbackPage'
import DiagnosisPage from './pages/DiagnosisPage'
import ResultPage from './pages/ResultPage'
import TrainerSelectPage from './pages/TrainerSelectPage'
import TrainerGeneratingPage from './pages/TrainerGeneratingPage'
// ── 新リデザイン画面（4タブ構成） ──
import TrainerChatPage from './pages/TrainerChatPage'
import RecordPage      from './pages/RecordPage'
import ChallengePage   from './pages/ChallengePage'
import SettingsPage    from './pages/SettingsPage'

// 認証済みユーザー専用
function ProtectedRoute({ children }) {
  const { user, initialized } = useAuthStore()
  if (!initialized) return <Spinner fullScreen />
  if (!user) return <Navigate to="/login" replace />
  return children
}

// 未認証ユーザー専用（ログイン済みなら適切な画面へ）
function AuthRoute({ children }) {
  const { user, profile, initialized } = useAuthStore()
  if (!initialized) return <Spinner fullScreen />
  if (user) {
    if (!profile?.diagnosis_done_at) return <Navigate to="/diagnosis" replace />
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export default function App() {
  const initialize = useAuthStore(s => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <BrowserRouter>
      <Routes>
        {/* 認証ルート */}
        <Route path="/login"  element={<AuthRoute><LoginPage /></AuthRoute>} />
        <Route path="/signup" element={<AuthRoute><SignupPage /></AuthRoute>} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* 診断フロー（保護済み） */}
        <Route path="/diagnosis"          element={<ProtectedRoute><DiagnosisPage /></ProtectedRoute>} />
        <Route path="/result"             element={<ProtectedRoute><ResultPage /></ProtectedRoute>} />
        <Route path="/trainer-select"     element={<ProtectedRoute><TrainerSelectPage /></ProtectedRoute>} />
        <Route path="/trainer-generating" element={<ProtectedRoute><TrainerGeneratingPage /></ProtectedRoute>} />

        {/* メインアプリ（保護済み） ── 新4タブ構成 */}
        <Route path="/dashboard" element={<ProtectedRoute><TrainerChatPage /></ProtectedRoute>} />
        <Route path="/record"    element={<ProtectedRoute><RecordPage /></ProtectedRoute>} />
        <Route path="/history"   element={<ProtectedRoute><ChallengePage /></ProtectedRoute>} />
        <Route path="/settings"  element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

        {/* デフォルト */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
