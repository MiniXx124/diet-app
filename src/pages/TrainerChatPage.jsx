import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useDashboardStore } from '../stores/dashboardStore'
import { supabase } from '../lib/supabase'
import {
  sendChatMessage,
  sendChatMessageWithImage,
  getLocalGreeting,
} from '../lib/trainerChat'
import { ensureTrainerImage } from '../lib/trainerImageGen'
import BottomNav from '../components/BottomNav'

// ─── 定数 ─────────────────────────────────────────────────
const FREE_SESSION_LIMIT = 5   // 無料で見られるセッション数
const POINTS_PER_MEAL    = 30  // 食事記録ポイント

// ─── メッセージバブル ──────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex items-end gap-2 mb-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-base shrink-0 mb-1">
          {msg.trainerEmoji ?? '🤖'}
        </div>
      )}
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-emerald-500 text-white rounded-br-sm'
            : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
        }`}
      >
        {msg.imagePreview && (
          <img
            src={msg.imagePreview}
            alt="food"
            className="w-40 h-32 object-cover rounded-xl mb-2"
          />
        )}
        {msg.content}
      </div>
    </div>
  )
}

// ─── 過去セッション ────────────────────────────────────────
function PastSession({ session, trainerEmoji }) {
  const [open, setOpen] = useState(false)
  const date = new Date(session.created_at)
  const label = date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white mb-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-600 active:bg-gray-50"
      >
        <span className="font-medium">{label} のチャット</span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-50">
          {session.messages.map((m, i) => (
            <MessageBubble key={i} msg={{ ...m, trainerEmoji }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 体重入力モーダル ──────────────────────────────────────
function WeightModal({ trainer, onClose, onSubmit }) {
  const [kg, setKg] = useState('')
  const [timeOfDay, setTimeOfDay] = useState('morning')

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
      <div className="w-full max-w-sm mx-auto bg-white rounded-t-3xl px-6 pt-5 pb-8 animate-slideUp">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h3 className="text-base font-bold text-gray-800 mb-4">⚖️ 体重を記録</h3>

        <div className="flex gap-2 mb-4">
          {['morning', 'evening'].map(t => (
            <button
              key={t}
              onClick={() => setTimeOfDay(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                timeOfDay === t
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {t === 'morning' ? '🌅 朝' : '🌙 夜'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-5">
          <input
            type="number"
            step="0.1"
            value={kg}
            onChange={e => setKg(e.target.value)}
            placeholder="00.0"
            className="flex-1 text-3xl font-bold text-center text-gray-800 bg-gray-50 border border-gray-200 rounded-2xl py-4 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <span className="text-lg font-semibold text-gray-500">kg</span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-medium text-gray-600"
          >
            キャンセル
          </button>
          <button
            onClick={() => {
              const val = parseFloat(kg)
              if (val > 20 && val < 300) onSubmit(val, timeOfDay)
            }}
            className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white text-sm font-bold"
          >
            記録する
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── トレーナーヘッダー（DALL-E 3 画像対応） ──────────────
function TrainerHeader({ trainer, userTrainer, imageUrl, imageGenerating, imageError, onRetry }) {
  const level    = userTrainer?.current_level ?? 1
  const mood     = userTrainer?.mood ?? 'motivated'
  const moodMap  = { motivated: '😄', normal: '🙂', concerned: '😕', disappointed: '😞', angry: '😤' }
  const moodEmoji = moodMap[mood] ?? '🙂'

  const gradientMap = {
    ryuya:  'from-red-600 via-red-500 to-orange-500',
    yoko:   'from-yellow-400 via-orange-400 to-orange-500',
    takumi: 'from-blue-700 via-blue-500 to-indigo-500',
    ren:    'from-gray-900 via-rose-900 to-red-800',
    sakura: 'from-pink-300 via-pink-400 to-rose-400',
    kenta:  'from-teal-500 via-emerald-500 to-emerald-600',
  }
  const gradient = gradientMap[trainer?.code] ?? 'from-emerald-600 to-teal-500'

  return (
    <div className="relative overflow-hidden" style={{ height: '360px' }}>
      {/* グラデーション背景（常時表示） */}
      <div className={`absolute inset-0 bg-gradient-to-b ${gradient}`} />

      {/* ── 画像あり（1024x1024、頭〜胸を表示 objectPosition: top） ── */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={trainer?.name}
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
      )}

      {/* ── 生成中 ── */}
      {!imageUrl && imageGenerating && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="text-6xl animate-pulse">{trainer?.emoji ?? '🤖'}</div>
          <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            <span className="text-white text-xs font-medium ml-1">AI画像を生成中...</span>
          </div>
          <p className="text-white/60 text-xs">初回のみ20〜30秒ほどかかります</p>
        </div>
      )}

      {/* ── エラー表示（失敗時） ── */}
      {!imageUrl && !imageGenerating && imageError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4">
          <div className="text-5xl">{trainer?.emoji ?? '🤖'}</div>
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-4 py-3 text-center max-w-xs">
            <p className="text-white/90 text-xs mb-1 font-medium">画像生成に失敗しました</p>
            <p className="text-white/60 text-[10px] mb-2 break-all">{imageError}</p>
            <button
              onClick={onRetry}
              className="bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-4 py-1.5 rounded-full transition-colors"
            >
              🔄 再試行
            </button>
          </div>
        </div>
      )}

      {/* ── フォールバック（絵文字） ── */}
      {!imageUrl && !imageGenerating && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-8xl drop-shadow-lg">{trainer?.emoji ?? '🤖'}</div>
        </div>
      )}

      {/* 下からのグラデーションオーバーレイ（テキスト可読性） */}
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      {/* iOS safe area */}
      <div className="absolute top-0 inset-x-0 bg-black/10" style={{ height: 'env(safe-area-inset-top)' }} />

      {/* テキストオーバーレイ */}
      <div className="absolute bottom-0 inset-x-0 px-5 pb-4 max-w-sm mx-auto"
           style={{ left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '384px' }}>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-[11px] text-white/80 bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full font-medium">
              {trainer?.title ?? 'AIトレーナー'}
            </span>
            <div className="text-2xl font-bold text-white mt-1 drop-shadow">
              {trainer?.name ?? 'トレーナー'}
            </div>
            <div className="text-sm text-white/70">{trainer?.kana ?? ''}</div>
          </div>
          <div className="flex flex-col items-end gap-1.5 mb-0.5">
            <div className="bg-white/25 backdrop-blur-sm rounded-xl px-3 py-1 text-white text-sm font-bold">
              Lv.{level}
            </div>
            <div className="text-xl">{moodEmoji}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── メインコンポーネント ──────────────────────────────────
export default function TrainerChatPage() {
  const { user, profile } = useAuthStore()
  const { trainer, userTrainer, consecutiveDays, loading, addWeightRecord, fetchDashboard } =
    useDashboardStore()

  const [messages, setMessages] = useState([])        // 現セッション
  const [pastSessions, setPastSessions] = useState([]) // 過去セッション（最大5件）
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [actionFeedback, setActionFeedback] = useState(null)
  // ── トレーナー画像 ──
  const [trainerImageUrl,  setTrainerImageUrl]  = useState(null)
  const [imageGenerating,  setImageGenerating]  = useState(false)
  const [imageError,       setImageError]       = useState(null)
  const imageTriggeredRef = useRef(false)
  const prevMoodRef       = useRef(null)   // mood変化検知用

  const sessionId = useRef(crypto.randomUUID())
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)
  const recognitionRef = useRef(null)

  // ─── 初期ロード ───────────────────────────────────────
  useEffect(() => {
    if (!user) return
    fetchDashboard(user.id, profile)
    loadPastSessions()
  }, [user?.id])

  // ─── 画像生成の共通関数（初回＆リトライ共用、mood連動） ──
  const triggerImageGeneration = useCallback(() => {
    if (!trainer || !user) return
    const mood = userTrainer?.mood ?? 'motivated'
    setImageGenerating(true)
    setImageError(null)
    ensureTrainerImage(user.id, trainer.code, null, mood)
      .then(url => {
        if (url) {
          setTrainerImageUrl(url)
          setImageError(null)
        } else {
          setImageError('URLが取得できませんでした')
        }
      })
      .catch(err => {
        console.error('Trainer image gen failed:', err)
        const msg = err?.message ?? String(err)
        setImageError(msg.length > 80 ? msg.slice(0, 80) + '…' : msg)
      })
      .finally(() => setImageGenerating(false))
  }, [trainer?.code, user?.id, userTrainer?.mood])

  // ─── トレーナー画像：DBに既存URLがあれば表示、なければ生成 ──
  useEffect(() => {
    if (!trainer || !user || !userTrainer) return
    if (imageTriggeredRef.current) return
    imageTriggeredRef.current = true

    const existingUrl = userTrainer.trainer_image_url
    if (existingUrl) {
      setTrainerImageUrl(existingUrl)
      return
    }

    // 初回 → 生成
    prevMoodRef.current = userTrainer.mood ?? 'motivated'
    triggerImageGeneration()
  }, [trainer?.code, userTrainer?.id])

  // ─── mood変化を検知して再生成（6時間に1回まで） ──────────
  useEffect(() => {
    if (!trainer || !user || !userTrainer || !imageTriggeredRef.current) return
    if (imageGenerating) return

    const currentMood = userTrainer.mood ?? 'motivated'
    if (prevMoodRef.current === null || prevMoodRef.current === currentMood) return

    // mood変化を検知
    prevMoodRef.current = currentMood

    // レート制限：6時間に1回まで再生成
    const rateKey = `mood_regen_${user.id}_${trainer.code}`
    const last = Number(localStorage.getItem(rateKey) ?? 0)
    const hoursSince = (Date.now() - last) / 3_600_000
    if (hoursSince < 6) return

    localStorage.setItem(rateKey, String(Date.now()))

    // DB上のURLをリセットして再生成
    supabase.from('user_trainers')
      .update({ trainer_image_url: null })
      .eq('user_id', user.id)
      .eq('is_current', true)
      .then(() => {
        setTrainerImageUrl(null)
        imageTriggeredRef.current = false
        triggerImageGeneration()
      })
  }, [userTrainer?.mood])

  // トレーナーが揃ったら挨拶
  useEffect(() => {
    if (!trainer || messages.length > 0) return
    const greeting = getLocalGreeting(trainer, {
      nickname: profile?.username ?? '',
      streak:   consecutiveDays,
      hasRecordedToday: false,
    })
    setMessages([{
      role: 'assistant',
      content: greeting,
      trainerEmoji: trainer.emoji,
    }])
  }, [trainer?.code])

  // メッセージ追加時にスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── 過去セッション読み込み ───────────────────────────
  const loadPastSessions = async () => {
    if (!user) return
    try {
      // 過去のセッションIDを取得（新しい順）
      const { data: sessionRows } = await supabase
        .from('chat_messages')
        .select('session_id, created_at')
        .eq('user_id', user.id)
        .neq('session_id', sessionId.current)
        .order('created_at', { ascending: false })

      if (!sessionRows?.length) return

      // ユニークなセッションIDを5つ取得
      const seen = new Set()
      const sessionIds = []
      for (const row of sessionRows) {
        if (!seen.has(row.session_id)) {
          seen.add(row.session_id)
          sessionIds.push({ id: row.session_id, created_at: row.created_at })
          if (sessionIds.length >= FREE_SESSION_LIMIT) break
        }
      }

      // 各セッションのメッセージを取得
      const sessions = await Promise.all(
        sessionIds.map(async (s) => {
          const { data: msgs } = await supabase
            .from('chat_messages')
            .select('role, content, created_at')
            .eq('user_id', user.id)
            .eq('session_id', s.id)
            .order('created_at', { ascending: true })
          return { session_id: s.id, created_at: s.created_at, messages: msgs ?? [] }
        })
      )
      setPastSessions(sessions.filter(s => s.messages.length > 0))
    } catch (e) {
      // テーブル未作成など → エラー無視
      console.warn('Past sessions load failed:', e.message)
    }
  }

  // ─── メッセージをDBに保存 ─────────────────────────────
  const saveMessageToDB = async (role, content, actions = []) => {
    if (!user) return
    try {
      await supabase.from('chat_messages').insert({
        user_id:    user.id,
        session_id: sessionId.current,
        role,
        content,
        actions,
      })
    } catch {
      // テーブル未作成でもUI上はエラーにしない
    }
  }

  // ─── アクション実行 ───────────────────────────────────
  const executeActions = async (actions) => {
    if (!actions?.length || !user) return
    const feedbacks = []

    for (const action of actions) {
      if (action.type === 'weight_record') {
        const kg = parseFloat(action.kg)
        const time = action.time_of_day ?? 'morning'
        if (kg > 20 && kg < 300) {
          await addWeightRecord(user.id, time, kg)
          feedbacks.push(`⚖️ ${kg}kg を記録しました！`)
        }
      }

      if (action.type === 'meal_record') {
        const today = new Date().toISOString().split('T')[0]
        await supabase.from('meal_records').insert({
          user_id:    user.id,
          meal_date:  today,
          meal_type:  action.meal_type ?? 'other',
          food_name:  action.food_name ?? '食事',
          calories:   action.calories  ?? 0,
          protein:    action.protein   ?? 0,
          fat:        action.fat       ?? 0,
          carbs:      action.carbs     ?? 0,
          input_method: 'ai_chat',
        })
        await supabase.from('point_transactions').insert({
          user_id:     user.id,
          points:      POINTS_PER_MEAL,
          reason:      'meal_record',
          description: action.food_name ?? '食事記録',
        })
        feedbacks.push(`🍽 ${action.food_name ?? '食事'} を記録しました！`)
      }
    }

    if (feedbacks.length > 0) {
      setActionFeedback(feedbacks.join('  '))
      setTimeout(() => setActionFeedback(null), 3000)
    }
  }

  // ─── テキスト送信 ─────────────────────────────────────
  const handleSend = useCallback(async (text = input.trim()) => {
    if (!text || sending || !trainer) return
    setInput('')

    const userMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setSending(true)
    await saveMessageToDB('user', text)

    // APIに渡す会話履歴（最新10件に制限）
    const apiHistory = newMessages
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }))

    const userCtx = {
      nickname:      profile?.username ?? '',
      currentWeight: null,
      targetWeight:  profile?.goal_weight ?? null,
      streak:        consecutiveDays,
      level:         userTrainer?.current_level ?? 1,
    }

    const result = await sendChatMessage(apiHistory, trainer, userCtx)

    const assistantMsg = {
      role: 'assistant',
      content: result.message,
      trainerEmoji: trainer.emoji,
    }
    setMessages(prev => [...prev, assistantMsg])
    setSending(false)
    await saveMessageToDB('assistant', result.message, result.actions)
    await executeActions(result.actions)
  }, [input, sending, trainer, messages, profile, userTrainer, consecutiveDays])

  // ─── 画像送信 ─────────────────────────────────────────
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !trainer) return

    // ファイルをbase64に変換
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(',')[1]
      const previewUrl = ev.target.result

      const userMsg = {
        role: 'user',
        content: '📷 食事の写真を送りました',
        imagePreview: previewUrl,
      }
      const newMessages = [...messages, userMsg]
      setMessages(newMessages)
      setSending(true)
      await saveMessageToDB('user', '📷 食事の写真を送りました')

      const apiHistory = newMessages
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }))
        .concat([{ role: 'user', content: 'この食事の内容と栄養を記録してください' }])

      const userCtx = {
        nickname:      profile?.username ?? '',
        targetWeight:  profile?.goal_weight ?? null,
        streak:        consecutiveDays,
        level:         userTrainer?.current_level ?? 1,
      }

      const result = await sendChatMessageWithImage(
        apiHistory.slice(0, -1),
        trainer,
        userCtx,
        base64
      )

      const assistantMsg = {
        role: 'assistant',
        content: result.message,
        trainerEmoji: trainer.emoji,
      }
      setMessages(prev => [...prev, assistantMsg])
      setSending(false)
      await saveMessageToDB('assistant', result.message, result.actions)
      await executeActions(result.actions)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ─── 音声入力 ─────────────────────────────────────────
  const handleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('このブラウザは音声入力に対応していません')
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'ja-JP'
    recognition.continuous = false
    recognition.interimResults = false
    recognitionRef.current = recognition

    recognition.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? ''
      if (text) {
        setInput(prev => prev + text)
      }
    }
    recognition.onend = () => setIsListening(false)
    recognition.start()
    setIsListening(true)
  }

  // ─── 体重モーダルから記録 ─────────────────────────────
  const handleWeightSubmit = async (kg, timeOfDay) => {
    setShowWeightModal(false)
    if (!trainer) return

    const label = timeOfDay === 'morning' ? '朝' : '夜'
    const userMsg = { role: 'user', content: `${label}の体重は${kg}kgです` }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setSending(true)
    await saveMessageToDB('user', userMsg.content)

    const apiHistory = newMessages
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }))

    const userCtx = {
      nickname:      profile?.username ?? '',
      targetWeight:  profile?.goal_weight ?? null,
      streak:        consecutiveDays,
      level:         userTrainer?.current_level ?? 1,
    }

    const result = await sendChatMessage(apiHistory, trainer, userCtx)
    const assistantMsg = {
      role: 'assistant',
      content: result.message,
      trainerEmoji: trainer.emoji,
    }
    setMessages(prev => [...prev, assistantMsg])
    setSending(false)
    await saveMessageToDB('assistant', result.message, result.actions)
    await executeActions(result.actions)
  }

  // ─── ローディング状態 ─────────────────────────────────
  if (loading && !trainer) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">🤖</div>
          <p className="text-sm text-gray-400">トレーナーを呼んでいます...</p>
        </div>
      </div>
    )
  }

  // ─── レンダリング ─────────────────────────────────────
  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col pb-16">
      {/* トレーナーヘッダー */}
      <TrainerHeader
        trainer={trainer}
        userTrainer={userTrainer}
        imageUrl={trainerImageUrl}
        imageGenerating={imageGenerating}
        imageError={imageError}
        onRetry={() => {
          imageTriggeredRef.current = false
          triggerImageGeneration()
        }}
      />

      {/* アクションフィードバック */}
      {actionFeedback && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-lg animate-fadeSlideUp">
          {actionFeedback}
        </div>
      )}

      {/* チャットエリア */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 max-w-sm w-full mx-auto">

        {/* 過去セッション */}
        {pastSessions.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-400 font-medium mb-2 text-center">── 過去のチャット ──</p>
            {pastSessions.map(s => (
              <PastSession key={s.session_id} session={s} trainerEmoji={trainer?.emoji} />
            ))}
            <p className="text-xs text-gray-400 text-center mb-3">── 今日のチャット ──</p>
          </div>
        )}

        {/* 現セッションのメッセージ */}
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {/* 送信中インジケーター */}
        {sending && (
          <div className="flex items-end gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-base shrink-0">
              {trainer?.emoji ?? '🤖'}
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      <div className="fixed bottom-16 inset-x-0 bg-white border-t border-gray-100 px-4 py-3 z-30">
        <div className="max-w-sm mx-auto">
          {/* クイックアクション */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-50 text-amber-600 text-sm font-medium border border-amber-100 active:scale-95 transition-transform"
            >
              📷 <span>写真</span>
            </button>
            <button
              onClick={handleVoice}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium border transition-all active:scale-95 ${
                isListening
                  ? 'bg-red-500 text-white border-red-400 animate-pulse'
                  : 'bg-blue-50 text-blue-600 border-blue-100'
              }`}
            >
              🎤 <span>{isListening ? '聞いてる...' : '音声'}</span>
            </button>
            <button
              onClick={() => setShowWeightModal(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-100 active:scale-95 transition-transform"
            >
              ⚖️ <span>体重</span>
            </button>
          </div>

          {/* テキスト入力 */}
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={trainer ? `${trainer.name}に話しかける...` : 'メッセージを入力...'}
              rows={1}
              className="flex-1 resize-none bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 max-h-28 overflow-y-auto"
              style={{ lineHeight: '1.5' }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || sending}
              className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white text-lg disabled:opacity-40 active:scale-95 transition-transform shrink-0"
            >
              ➤
            </button>
          </div>
        </div>

        {/* 隠しファイルインプット */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleImageSelect}
        />
      </div>

      {/* 体重入力モーダル */}
      {showWeightModal && (
        <WeightModal
          trainer={trainer}
          onClose={() => setShowWeightModal(false)}
          onSubmit={handleWeightSubmit}
        />
      )}

      <BottomNav />
    </div>
  )
}
