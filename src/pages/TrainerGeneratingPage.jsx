import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDiagnosisStore } from '../stores/diagnosisStore'
import { PERSONALITY_TYPES } from '../data/personalityTypes'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

// AI生成ステップ定義
const STEPS = [
  { label: '性格データを分析中...', duration: 800 },
  { label: 'トレーナーとの相性を計算中...', duration: 900 },
  { label: 'トレーニングプログラムを生成中...', duration: 1000 },
  { label: '初期パラメータをカスタマイズ中...', duration: 700 },
  { label: 'データを保存中...', duration: 600 },
]
const TOTAL_DURATION = STEPS.reduce((s, step) => s + step.duration, 0)

export default function TrainerGeneratingPage() {
  const navigate = useNavigate()
  const { personalityType, selectedTrainer, reset } = useDiagnosisStore()
  const { user, fetchProfile } = useAuthStore()

  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState([])
  const [done, setDone] = useState(false)
  const [saved, setSaved] = useState(false)

  // タイプ・トレーナー未選択の場合はリダイレクト（完了後のreset()では飛ばない）
  useEffect(() => {
    if (!done && (!personalityType || !selectedTrainer)) {
      navigate('/diagnosis', { replace: true })
    }
  }, [personalityType, selectedTrainer, navigate, done])

  // プログレスアニメーション
  useEffect(() => {
    if (!personalityType || !selectedTrainer) return

    let elapsed = 0
    const interval = setInterval(() => {
      elapsed += 50
      setProgress(Math.min((elapsed / TOTAL_DURATION) * 100, 100))
    }, 50)

    // ステップ逐次完了
    let stepElapsed = 0
    STEPS.forEach((step, index) => {
      stepElapsed += step.duration
      setTimeout(() => {
        setCurrentStep(index + 1)
        setCompletedSteps(prev => [...prev, index])
      }, stepElapsed)
    })

    // 全完了後にDB保存 & 完了表示
    setTimeout(async () => {
      clearInterval(interval)
      setProgress(100)

      if (user && selectedTrainer) {
        try {
          // user_trainers に挿入（既存があればupsert）
          await supabase.from('user_trainers').upsert({
            user_id: user.id,
            trainer_id: selectedTrainer.id,
            is_current: true,
            exp_points: 0,
            decay_points: 0,
            current_level: 1,
            last_record_at: new Date().toISOString().split('T')[0],
            mood: 'motivated',
          }, { onConflict: 'user_id,trainer_id' })

          // 他のトレーナーを非アクティブに
          await supabase
            .from('user_trainers')
            .update({ is_current: false })
            .eq('user_id', user.id)
            .neq('trainer_id', selectedTrainer.id)

          // 診断完了フラグを立てる
          await supabase.from('user_profiles').update({
            diagnosis_done_at: new Date().toISOString(),
          }).eq('id', user.id)

          await fetchProfile(user.id)
        } catch (err) {
          console.error('Save error:', err)
        }
      }

      setSaved(true)
      // 1秒後に完了画面表示
      setTimeout(() => setDone(true), 500)
    }, TOTAL_DURATION + 300)

    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!personalityType || !selectedTrainer) return null

  const myType = PERSONALITY_TYPES[personalityType]

  // 完了画面
  if (done) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col items-center justify-center px-5">
        <div className="text-center animate-bounceOnce">
          <div className={`
            inline-flex items-center justify-center w-28 h-28 rounded-3xl mb-5
            bg-gradient-to-br ${selectedTrainer.gradient}
            shadow-2xl shadow-black/40
          `}>
            <span className="text-6xl">{selectedTrainer.emoji}</span>
          </div>
        </div>

        <div className="text-center mb-8 animate-fadeSlideUp" style={{ animationDelay: '200ms' }}>
          <p className="text-gray-400 text-sm mb-2">トレーナー決定！</p>
          <h1 className="text-3xl font-extrabold text-white mb-2">
            {selectedTrainer.name}
          </h1>
          <p className="text-gray-300 text-sm">が相棒になりました 🎉</p>
        </div>

        {/* セリフ */}
        <div
          className={`
            w-full max-w-sm bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-4 mb-8
            border border-white/20 text-center animate-fadeSlideUp
          `}
          style={{ animationDelay: '400ms' }}
        >
          <p className="text-white text-sm leading-relaxed italic">
            「{selectedTrainer.quote}」
          </p>
          <p className="text-gray-400 text-xs mt-2">— {selectedTrainer.name}トレーナー</p>
        </div>

        {/* 相性タイプ表示 */}
        <div className="flex items-center gap-2 mb-8 animate-fadeSlideUp" style={{ animationDelay: '500ms' }}>
          <span className="text-2xl">{myType.emoji}</span>
          <div>
            <p className="text-white text-sm font-semibold">{myType.name}</p>
            <p className="text-gray-400 text-xs">× {selectedTrainer.name}トレーナー</p>
          </div>
        </div>

        <div className="w-full max-w-sm animate-fadeSlideUp" style={{ animationDelay: '600ms' }}>
          <button
            onClick={() => {
              reset()
              navigate('/dashboard', { replace: true })
            }}
            className="w-full py-4 rounded-2xl font-bold text-white text-base bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-900/40 active:scale-[0.98] transition-all"
          >
            ダイエットをはじめる！ 🔥
          </button>
        </div>
      </div>
    )
  }

  // 生成中画面
  return (
    <div className="min-h-dvh bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col items-center justify-center px-5">
      {/* トレーナーアニメーション */}
      <div className="text-center mb-8">
        <div className={`
          inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-4
          bg-gradient-to-br ${selectedTrainer.gradient}
          shadow-xl shadow-black/40
          ${progress < 100 ? 'animate-pulse' : ''}
        `}>
          <span className="text-5xl">{selectedTrainer.emoji}</span>
        </div>
        <h2 className="text-white font-bold text-lg">AIがカスタマイズ中</h2>
        <p className="text-gray-400 text-sm mt-1">{selectedTrainer.name}トレーナーを準備しています</p>
      </div>

      {/* プログレスバー */}
      <div className="w-full max-w-sm mb-6">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-gray-400">準備完了まで</span>
          <span className="text-emerald-400 font-bold">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ステップリスト */}
      <div className="w-full max-w-sm space-y-2">
        {STEPS.map((step, i) => {
          const isCompleted = completedSteps.includes(i)
          const isCurrent = currentStep === i && !isCompleted

          return (
            <div
              key={i}
              className={`
                flex items-center gap-3 px-4 py-2.5 rounded-xl
                transition-all duration-300
                ${isCompleted ? 'bg-white/10' : isCurrent ? 'bg-emerald-500/20' : 'opacity-40'}
              `}
            >
              {/* アイコン */}
              <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                {isCompleted ? (
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : isCurrent ? (
                  <div className="w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
                ) : (
                  <div className="w-3 h-3 bg-gray-600 rounded-full" />
                )}
              </div>

              {/* テキスト */}
              <span className={`text-sm ${isCompleted ? 'text-gray-300' : isCurrent ? 'text-emerald-300 font-medium' : 'text-gray-500'}`}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {saved && !done && (
        <p className="text-emerald-400 text-xs mt-6 animate-pulse">完了！画面を準備中…</p>
      )}
    </div>
  )
}
