import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDiagnosisStore } from '../stores/diagnosisStore'
import { PERSONALITY_TYPES } from '../data/personalityTypes'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

function StatBar({ value, max = 10, color }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const timer = setTimeout(() => setWidth((value / max) * 100), 300)
    return () => clearTimeout(timer)
  }, [value, max])

  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

export default function ResultPage() {
  const navigate = useNavigate()
  const { personalityType, answers } = useDiagnosisStore()
  const { user, fetchProfile } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [revealed, setRevealed] = useState(false)

  // タイプが未計算なら診断に戻す
  useEffect(() => {
    if (!personalityType) {
      navigate('/diagnosis', { replace: true })
      return
    }
    // 演出: 0.5秒後に表示
    const timer = setTimeout(() => setRevealed(true), 500)
    return () => clearTimeout(timer)
  }, [personalityType, navigate])

  if (!personalityType) return null

  const type = PERSONALITY_TYPES[personalityType]

  // 各タイプの得点を集計
  const scores = {}
  answers.filter(Boolean).forEach(({ type: t }) => {
    scores[t] = (scores[t] || 0) + 1
  })

  const handleNext = async () => {
    setSaving(true)
    // user_profiles に personality_type を保存
    if (user) {
      await supabase
        .from('user_profiles')
        .update({ personality_type: personalityType })
        .eq('id', user.id)
      await fetchProfile(user.id)
    }
    navigate('/trainer-select', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      {/* アニメーション前 */}
      {!revealed && (
        <div className="flex-1 flex flex-col items-center justify-center px-5">
          <div className="text-center animate-pulse">
            <div className="text-5xl mb-4">🧠</div>
            <p className="text-white text-lg font-medium">診断中…</p>
          </div>
        </div>
      )}

      {/* 結果表示 */}
      {revealed && (
        <div className="flex-1 flex flex-col">
          {/* ヒーロー部分 */}
          <div className={`bg-gradient-to-br ${type.gradient} px-5 pt-12 pb-10 text-center`}>
            <p className="text-white/70 text-xs font-medium tracking-widest uppercase mb-3 animate-fadeSlideUp">
              あなたのタイプ
            </p>
            <div className="text-7xl mb-4 animate-bounceOnce">{type.emoji}</div>
            <h1 className="text-2xl font-extrabold text-white mb-1 animate-fadeSlideUp" style={{ animationDelay: '100ms' }}>
              {type.name}
            </h1>
            <p className="text-white/70 text-sm animate-fadeSlideUp" style={{ animationDelay: '150ms' }}>
              {answers.filter(Boolean).length}問中 最多タイプで判定
            </p>
          </div>

          {/* 詳細カード */}
          <div className="flex-1 bg-white rounded-t-3xl -mt-4 px-5 pt-6 pb-8 space-y-6">
            {/* 説明 */}
            <div className="animate-fadeSlideUp" style={{ animationDelay: '200ms' }}>
              <p className="text-gray-700 text-sm leading-relaxed">{type.description}</p>
            </div>

            {/* 強みと弱点 */}
            <div className="grid grid-cols-2 gap-3 animate-fadeSlideUp" style={{ animationDelay: '300ms' }}>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-emerald-600 mb-2">💪 強み</p>
                <ul className="space-y-1">
                  {type.strengths.map(s => (
                    <li key={s} className="text-xs text-gray-700 flex items-start gap-1">
                      <span className="text-emerald-500 mt-0.5">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-orange-600 mb-2">⚡ 課題</p>
                <ul className="space-y-1">
                  {type.weaknesses.map(w => (
                    <li key={w} className="text-xs text-gray-700 flex items-start gap-1">
                      <span className="text-orange-400 mt-0.5">•</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* アドバイス */}
            <div
              className={`${type.lightBg} border ${type.border} rounded-2xl p-4 animate-fadeSlideUp`}
              style={{ animationDelay: '400ms' }}
            >
              <p className={`text-xs font-bold ${type.text} mb-1`}>🎯 あなたへのアドバイス</p>
              <p className="text-sm text-gray-700 leading-relaxed">{type.advice}</p>
            </div>

            {/* 次へボタン */}
            <div className="animate-fadeSlideUp" style={{ animationDelay: '500ms' }}>
              <button
                onClick={handleNext}
                disabled={saving}
                className={`
                  w-full py-4 rounded-2xl font-bold text-white text-base
                  bg-gradient-to-r ${type.gradient}
                  shadow-lg shadow-black/20
                  transition-all duration-150 active:scale-[0.98]
                  disabled:opacity-70
                  flex items-center justify-center gap-2
                `}
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    保存中…
                  </>
                ) : (
                  <>
                    トレーナーを選ぶ
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
              <p className="text-center text-xs text-gray-400 mt-3">
                あなたのタイプに相性のよいトレーナーを紹介します
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
