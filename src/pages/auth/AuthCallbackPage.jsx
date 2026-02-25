import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/ui/Spinner'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    const handleCallback = async () => {
      // URLのハッシュフラグメントからセッションを取得（OAuth・メール確認後）
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        setError('認証に失敗しました。再度お試しください。')
        setTimeout(() => navigate('/login'), 3000)
        return
      }

      if (session) {
        // プロフィール確認 → 診断済みかどうかで遷移先を決定
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('diagnosis_done_at')
          .eq('id', session.user.id)
          .single()

        if (profile?.diagnosis_done_at) {
          navigate('/dashboard', { replace: true })
        } else {
          navigate('/diagnosis', { replace: true })
        }
      } else {
        // セッションがない場合は少し待ってリトライ（メール確認直後など）
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession()
          if (retrySession) {
            navigate('/diagnosis', { replace: true })
          } else {
            navigate('/login', { replace: true })
          }
        }, 1500)
      }
    }

    handleCallback()
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50 px-5">
        <div className="text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-gray-700 font-medium">{error}</p>
          <p className="text-gray-400 text-sm mt-1">ログイン画面へリダイレクト中…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-emerald-950 to-emerald-800">
      <div className="text-center">
        <div className="text-5xl mb-5">🏋️</div>
        <Spinner size="lg" color="white" />
        <p className="text-emerald-200 text-sm mt-4">ログイン中…</p>
      </div>
    </div>
  )
}
