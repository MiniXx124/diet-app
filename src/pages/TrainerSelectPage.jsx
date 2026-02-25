import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TRAINERS, getSortedTrainers } from '../data/trainers'
import { PERSONALITY_TYPES } from '../data/personalityTypes'
import { useDiagnosisStore } from '../stores/diagnosisStore'

// ────────────────────────────────────────────
// トレーナーのAI生成プレースホルダーカード
// 雀魂・ポーカーチェイス風のキャラクターイラスト風レイアウト
// ────────────────────────────────────────────
function TrainerAvatarCard({ trainer, isRecommended }) {
  // 各トレーナーの特徴を表すビジュアル要素
  const visualConfig = {
    ryuya:  { bg: 'from-red-900 via-red-700 to-orange-600',  accent: 'bg-red-500',    symbol: '🥊', aura: 'shadow-red-500/50',    label: 'POWER',  subEmojis: ['💪', '🔴', '⚡'] },
    yoko:   { bg: 'from-yellow-600 via-orange-500 to-pink-500', accent: 'bg-yellow-400', symbol: '⭐', aura: 'shadow-yellow-400/50', label: 'SMILE',  subEmojis: ['🌟', '✨', '🎵'] },
    takumi: { bg: 'from-indigo-900 via-blue-700 to-cyan-600', accent: 'bg-blue-400',   symbol: '📊', aura: 'shadow-blue-400/50',   label: 'LOGIC',  subEmojis: ['🔬', '💡', '📈'] },
    ren:    { bg: 'from-gray-900 via-red-900 to-rose-700',    accent: 'bg-rose-500',   symbol: '🔥', aura: 'shadow-rose-500/50',   label: 'LIMIT',  subEmojis: ['⚔️', '🔥', '💥'] },
    sakura: { bg: 'from-rose-800 via-pink-600 to-pink-400',   accent: 'bg-pink-400',   symbol: '🌸', aura: 'shadow-pink-400/50',   label: 'GENTLE', subEmojis: ['🌺', '💗', '🌿'] },
    kenta:  { bg: 'from-emerald-900 via-teal-700 to-emerald-500', accent: 'bg-emerald-400', symbol: '😎', aura: 'shadow-emerald-400/50', label: 'BUDDY', subEmojis: ['✌️', '🤜', '🎯'] },
  }

  const v = visualConfig[trainer.code]

  return (
    <div className={`relative w-full aspect-[3/4] bg-gradient-to-b ${v.bg} rounded-2xl overflow-hidden shadow-lg ${v.aura}`}>

      {/* 背景装飾：放射状グロー */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20">
        <div className={`w-32 h-32 rounded-full ${v.accent} blur-3xl`} />
      </div>

      {/* 上部ラベル */}
      <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-10">
        <div className={`${v.accent} text-white text-[9px] font-black px-1.5 py-0.5 rounded-md tracking-widest opacity-90`}>
          {v.label}
        </div>
        {isRecommended && (
          <div className="bg-yellow-400 text-yellow-900 text-[9px] font-black px-1.5 py-0.5 rounded-md">
            ✦ BEST
          </div>
        )}
      </div>

      {/* メインキャラクターエリア */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* キャラクター本体（AI生成予定枠） */}
        <div className="relative">
          {/* AI生成イメージ枠 */}
          <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center backdrop-blur-sm">
            <span className="text-4xl">{trainer.emoji}</span>
          </div>
          {/* サブエモジ装飾 */}
          <span className="absolute -top-1 -right-1 text-lg">{v.subEmojis[0]}</span>
          <span className="absolute -bottom-1 -left-1 text-sm">{v.subEmojis[1]}</span>
        </div>

        {/* AI生成予定バッジ */}
        <div className="mt-2 flex items-center gap-1 bg-black/40 backdrop-blur-sm border border-white/20 rounded-full px-2 py-0.5">
          <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
          <span className="text-[9px] text-white/70 font-medium">AI IMAGE 生成予定</span>
        </div>
      </div>

      {/* 下部グラデーション + トレーナー名 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-8 pb-3 px-2">
        <p className="text-white font-black text-base leading-none">{trainer.name}</p>
        <p className="text-white/60 text-[10px] mt-0.5">{trainer.kana} · {trainer.title}</p>
      </div>

      {/* シンボルマーク（右下） */}
      <div className="absolute bottom-2 right-2 text-xl opacity-50">
        {v.symbol}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────
// ステータスバー
// ────────────────────────────────────────────
function StatRow({ label, value, max = 10, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 w-10 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
      <span className="text-[10px] text-gray-400 w-4 text-right">{value}</span>
    </div>
  )
}

// ────────────────────────────────────────────
// トレーナー詳細モーダル
// ────────────────────────────────────────────
function TrainerDetailModal({ trainer, personalityType, onSelect, onClose }) {
  const isRecommended = trainer.bestFor.includes(personalityType)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl animate-slideUp overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className={`bg-gradient-to-r ${trainer.gradient} px-5 py-5`}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-4xl border border-white/30">
              {trainer.emoji}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white">{trainer.name}</h3>
                {isRecommended && (
                  <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    ✦ おすすめ
                  </span>
                )}
              </div>
              <p className="text-white/70 text-xs">{trainer.kana} · {trainer.title}</p>
              <p className="text-white/80 text-xs mt-1 italic">「{trainer.quote}」</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* 説明 */}
          <p className="text-gray-700 text-sm leading-relaxed">{trainer.description}</p>

          {/* ステータス */}
          <div className="space-y-1.5">
            <StatRow label="厳しさ" value={trainer.strictness}   color="bg-red-400" />
            <StatRow label="親しみ" value={trainer.friendliness} color="bg-emerald-400" />
          </div>

          {/* タグ */}
          <div className="flex flex-wrap gap-1.5">
            {trainer.tags.map(tag => (
              <span key={tag} className={`text-xs font-medium px-2.5 py-1 rounded-full ${trainer.lightBg} ${trainer.accentText}`}>
                {tag}
              </span>
            ))}
          </div>

          {/* AI生成予定の説明 */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-start gap-2">
            <span className="text-base shrink-0">🎨</span>
            <div>
              <p className="text-xs font-semibold text-gray-700">本番版ではAI生成イラストに変わります</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                雀魂・ポーカーチェイス風のアニメキャラクターをDALL-E 3が生成。
                同じトレーナーでもユーザーごとに異なるビジュアルになります。
              </p>
            </div>
          </div>

          {/* 選択ボタン */}
          <button
            onClick={onSelect}
            className={`
              w-full py-4 rounded-2xl font-bold text-white text-base
              bg-gradient-to-r ${trainer.gradient}
              shadow-lg active:scale-[0.98] transition-all duration-150
            `}
          >
            {trainer.name}トレーナーを選ぶ
          </button>
        </div>

        {/* 閉じるボタン */}
        <div className="pb-5 safe-bottom text-center">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600">
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────
// メインページ
// ────────────────────────────────────────────
export default function TrainerSelectPage() {
  const navigate = useNavigate()
  const { personalityType, setSelectedTrainer } = useDiagnosisStore()
  const [detailTrainer, setDetailTrainer] = useState(null)

  useEffect(() => {
    if (!personalityType) navigate('/diagnosis', { replace: true })
  }, [personalityType, navigate])

  if (!personalityType) return null

  const myType = PERSONALITY_TYPES[personalityType]
  const sortedTrainers = getSortedTrainers(personalityType)

  const handleSelect = (trainer) => {
    setSelectedTrainer(trainer)
    setDetailTrainer(null)
    navigate('/trainer-generating', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-gray-950 flex flex-col">
      {/* ヘッダー */}
      <div className="px-5 pt-10 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{myType.emoji}</span>
          <p className="text-gray-400 text-xs">{myType.name} の相棒を選ぶ</p>
        </div>
        <h1 className="text-2xl font-extrabold text-white">トレーナー選択</h1>
        <p className="text-gray-500 text-sm mt-1">カードをタップして詳細を確認 → 選択</p>
      </div>

      {/* おすすめラベル */}
      <div className="px-5 mb-3">
        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
          <span className="text-yellow-400 text-xs">✦</span>
          <p className="text-yellow-300 text-xs font-medium">
            <span className="font-bold">BEST バッジ</span> 付きがあなたのタイプとの相性◎
          </p>
        </div>
      </div>

      {/* トレーナーグリッド (3列) */}
      <div className="flex-1 px-4 pb-8 max-w-lg mx-auto w-full">
        <div className="grid grid-cols-3 gap-2.5">
          {sortedTrainers.map((trainer, i) => {
            const isRecommended = trainer.bestFor.includes(personalityType)
            return (
              <button
                key={trainer.id}
                onClick={() => setDetailTrainer(trainer)}
                className={[
                  'relative flex flex-col rounded-2xl overflow-hidden text-left',
                  'transition-all duration-200 active:scale-[0.95]',
                  'animate-fadeSlideUp',
                  isRecommended
                    ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-gray-950'
                    : '',
                ].join(' ')}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <TrainerAvatarCard trainer={trainer} isRecommended={isRecommended} />
              </button>
            )
          })}
        </div>

        {/* 注釈 */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-xs leading-relaxed">
            🎨 本番実装ではDALL-E 3によるAI生成イラストに置き換わります
            <br />
            ユーザーごとに異なるオリジナルキャラクターが生成されます
          </p>
        </div>
      </div>

      {/* 詳細モーダル */}
      {detailTrainer && (
        <TrainerDetailModal
          trainer={detailTrainer}
          personalityType={personalityType}
          onSelect={() => handleSelect(detailTrainer)}
          onClose={() => setDetailTrainer(null)}
        />
      )}
    </div>
  )
}
