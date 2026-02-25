import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QUESTIONS } from '../data/diagnosisQuestions'
import { useDiagnosisStore } from '../stores/diagnosisStore'

const TOTAL = QUESTIONS.length // 30

const LABEL_COLORS = {
  A: 'bg-violet-100 text-violet-700',
  B: 'bg-blue-100 text-blue-700',
  C: 'bg-emerald-100 text-emerald-700',
  D: 'bg-orange-100 text-orange-700',
  E: 'bg-gray-100 text-gray-400',   // 「どれでもない」用
}

// ────────────────────────────────────────────
// イントロ画面
// ────────────────────────────────────────────
function IntroScreen({ onStart }) {
  const steps = [
    { icon: '🧠', label: '30問診断', desc: '約5分' },
    { icon: '🎯', label: 'タイプ判定', desc: '7種類' },
    { icon: '🤖', label: 'AI生成', desc: 'トレーナー' },
  ]

  const reasons = [
    {
      icon: '🔬',
      title: '7タイプを正確に見極めるため',
      body: '「三日坊主」「完璧主義」など7種類の性格は、少ない質問数では正確に判別できません。30問で複数の視点から分析することで、本当のあなたのタイプがわかります。',
    },
    {
      icon: '🤖',
      title: 'AIトレーナーをカスタマイズするため',
      body: '回答データを元に、トレーナーの口調・アドバイスの方向性・応援スタイルをあなた専用に調整します。同じトレーナーでも、人によって全く違う存在になります。',
    },
    {
      icon: '📈',
      title: '最適な成長プランを設計するため',
      body: 'あなたのモチベーションパターン・挫折しやすい場面・得意な継続スタイルを把握し、続けられるダイエットプランを自動生成します。',
    },
  ]

  return (
    <div className="min-h-dvh bg-gradient-to-b from-emerald-950 via-emerald-900 to-gray-900 flex flex-col">
      <div className="flex-1 overflow-y-auto px-5 pt-12 pb-6">
        {/* ヒーロー */}
        <div className="text-center mb-8 animate-fadeSlideUp">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500 rounded-3xl shadow-lg shadow-emerald-900/50 mb-4 text-4xl">
            🧠
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">性格診断</h1>
          <p className="text-emerald-300 text-sm mt-2 leading-relaxed">
            あなただけのAIトレーナーを生み出すための<br />たった一度の診断です
          </p>
        </div>

        {/* 3ステップ */}
        <div className="flex items-center justify-center gap-1 mb-8 animate-fadeSlideUp" style={{ animationDelay: '100ms' }}>
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex flex-col items-center justify-center border border-white/20">
                  <span className="text-2xl">{step.icon}</span>
                </div>
                <p className="text-white text-[11px] font-bold mt-1">{step.label}</p>
                <p className="text-emerald-400 text-[10px]">{step.desc}</p>
              </div>
              {i < steps.length - 1 && (
                <svg className="w-4 h-4 text-emerald-600 mb-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* なぜ30問？ */}
        <div className="mb-6 animate-fadeSlideUp" style={{ animationDelay: '150ms' }}>
          <h2 className="text-white font-bold text-base mb-3 flex items-center gap-2">
            <span className="text-yellow-400">💡</span> なぜ30問必要なの？
          </h2>
          <div className="space-y-3">
            {reasons.map((r, i) => (
              <div
                key={i}
                className="bg-white/8 border border-white/10 rounded-2xl p-4 animate-fadeSlideUp"
                style={{ animationDelay: `${200 + i * 80}ms` }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xl">{r.icon}</span>
                  <p className="text-white font-semibold text-sm">{r.title}</p>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed pl-7">{r.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 診断結果でできること */}
        <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-2xl p-4 mb-8 animate-fadeSlideUp" style={{ animationDelay: '500ms' }}>
          <p className="text-emerald-300 font-bold text-sm mb-3">✅ 診断後にできること</p>
          <ul className="space-y-2">
            {[
              '7タイプのうち自分がどれかを知る',
              '相性の良いAIトレーナーを選択',
              'あなた専用の成長・劣化システムが起動',
              '記録するたびにトレーナーが進化',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/80">
                <span className="text-emerald-400 mt-0.5 shrink-0">▸</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* 所要時間 */}
        <div className="flex items-center justify-center gap-4 mb-8 animate-fadeSlideUp" style={{ animationDelay: '550ms' }}>
          {[
            { icon: '⏱️', label: '所要時間', value: '約5分' },
            { icon: '📝', label: '問題数', value: '30問' },
            { icon: '🔄', label: 'やり直し', value: '何度でも' },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <p className="text-xl mb-1">{item.icon}</p>
              <p className="text-gray-500 text-[10px]">{item.label}</p>
              <p className="text-white text-xs font-bold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTAボタン */}
      <div className="px-5 pb-8 safe-bottom animate-fadeSlideUp" style={{ animationDelay: '600ms' }}>
        <button
          onClick={onStart}
          className="w-full py-4 rounded-2xl font-extrabold text-white text-lg bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-xl shadow-emerald-900/40 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2"
        >
          <span>診断スタート</span>
          <span className="text-xl">🚀</span>
        </button>
        <p className="text-center text-xs text-gray-600 mt-3">途中保存されます。いつでも再開できます。</p>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────
// メイン診断画面
// ────────────────────────────────────────────
export default function DiagnosisPage() {
  const navigate = useNavigate()
  const { answers, setAnswer, calculateAndSetType, reset } = useDiagnosisStore()

  const [phase, setPhase] = useState('intro')           // 'intro' | 'quiz'
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [animKey, setAnimKey] = useState(0)

  const question = QUESTIONS[current]
  const progress = (current / TOTAL) * 100

  useEffect(() => {
    if (phase !== 'quiz') return
    setSelected(answers[current]?.type ?? null)
    setAnimKey(k => k + 1)
  }, [current, phase])

  const handleSelect = (type) => {
    if (selected !== null) return // 連打防止（null = 未選択, 'skip' も有効な選択）
    setSelected(type ?? 'skip')  // type=null（どれでもない）は 'skip' として扱う
    setAnswer(current, type)     // null のままストアへ

    setTimeout(() => {
      if (current < TOTAL - 1) {
        setCurrent(c => c + 1)
        setSelected(null)
      } else {
        calculateAndSetType()
        navigate('/result', { replace: true })
      }
    }, 350)
  }

  const handleBack = () => {
    if (current > 0) {
      setCurrent(c => c - 1)
    } else {
      setPhase('intro')
    }
  }

  const handleRestart = () => {
    reset()
    setCurrent(0)
    setSelected(null)
    setPhase('intro')
  }

  if (phase === 'intro') {
    return <IntroScreen onStart={() => setPhase('quiz')} />
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-gray-50 to-white flex flex-col">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button
            onClick={handleBack}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-gray-100"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <p className="text-xs text-gray-400 font-medium">性格診断</p>
            <p className="text-sm font-bold text-gray-700">
              {current + 1} <span className="text-gray-400 font-normal">/ {TOTAL}</span>
            </p>
          </div>

          <button
            onClick={handleRestart}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded"
          >
            最初から
          </button>
        </div>

        <div className="max-w-lg mx-auto mt-2">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* 質問エリア */}
      <div className="flex-1 flex flex-col justify-center px-4 py-5 max-w-lg mx-auto w-full">
        <div
          key={`badge-${animKey}`}
          className="inline-flex items-center gap-1.5 mb-3 animate-fadeSlideUp"
        >
          <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full">
            Q{current + 1}
          </span>
          <span className="text-xs text-gray-400">
            {current < 10 ? '序盤' : current < 20 ? '中盤' : '終盤'}
          </span>
        </div>

        <h2
          key={`question-${animKey}`}
          className="text-lg font-bold text-gray-800 leading-relaxed mb-5 animate-fadeSlideUp"
          style={{ animationDelay: '50ms' }}
        >
          {question.text}
        </h2>

        {/* 選択肢（5択対応・縦リスト） */}
        <div className="space-y-2">
          {question.options.map((option, i) => {
            const isSkip = option.type === null
            const selKey = isSkip ? 'skip' : option.type
            const isSelected = selected === selKey
            const isOther = selected !== null && !isSelected

            return (
              <button
                key={option.label}
                onClick={() => handleSelect(option.type)}
                disabled={selected !== null}
                className={[
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left',
                  'transition-all duration-200 cursor-pointer animate-fadeSlideUp',
                  isSelected
                    ? 'border-emerald-400 bg-emerald-50 shadow-md shadow-emerald-100 scale-[1.01]'
                    : isOther
                    ? 'border-gray-100 bg-gray-50 opacity-35'
                    : isSkip
                    ? 'border-dashed border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-100/50'
                    : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 hover:shadow-sm active:scale-[0.98]',
                ].join(' ')}
                style={{ animationDelay: `${80 + i * 50}ms` }}
              >
                <span className={`
                  shrink-0 w-6 h-6 rounded-full text-[11px] font-bold
                  flex items-center justify-center transition-all duration-200
                  ${isSelected ? 'bg-emerald-500 text-white' : LABEL_COLORS[option.label]}
                `}>
                  {isSelected ? '✓' : option.label}
                </span>

                <span className={`
                  text-sm leading-snug flex-1
                  ${isSelected ? 'font-semibold text-emerald-800' : isSkip ? 'text-gray-400 italic' : 'font-medium text-gray-700'}
                `}>
                  {option.text}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="pb-6 text-center">
        <p className="text-xs text-gray-400">
          残り <span className="font-semibold text-gray-600">{TOTAL - current - 1}</span> 問
        </p>
      </div>
    </div>
  )
}
