const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

// ────────────────────────────────────────────────────
// システムプロンプト構築
// ────────────────────────────────────────────────────
export function buildSystemPrompt(trainer, userContext) {
  const {
    nickname = 'あなた',
    currentWeight,
    targetWeight,
    streak = 0,
    level = 1,
  } = userContext

  const today = new Date().toLocaleDateString('ja-JP', {
    month: 'long', day: 'numeric', weekday: 'long',
  })

  return `あなたはフィットネスアプリ「FitMentor」のAIトレーナー「${trainer.name}（${trainer.kana}）」です。
性格: ${trainer.personality}
説明: ${trainer.description}

ユーザー情報:
- ニックネーム: ${nickname}
- 現在の体重: ${currentWeight ? currentWeight + 'kg' : '未記録'}
- 目標体重: ${targetWeight ? targetWeight + 'kg' : '未設定'}
- 連続記録: ${streak}日
- レベル: ${level}
- 今日: ${today}

あなたの役割:
1. ユーザーと自然に会話しながら体重・食事の記録をサポートする
2. ユーザーのメッセージから意図を読み取り、体重や食事データをactionsに含める
3. トレーナーとしてキャラクターに沿ったアドバイスや励ましを行う

必須ルール:
- 必ず以下のJSON形式のみで返答すること（マークダウン・コードブロック不可）
- JSONの外にテキストを出力しないこと

返答フォーマット:
{"message": "トレーナーとしての返答（自然な日本語）", "actions": []}

actionsに使える型:
- 体重記録: {"type": "weight_record", "kg": 数値, "time_of_day": "morning"|"evening"|"other"}
- 食事記録: {"type": "meal_record", "food_name": "食事名", "calories": 数値, "protein": 数値, "fat": 数値, "carbs": 数値, "meal_type": "breakfast"|"lunch"|"dinner"|"snack"}

actionsの判断基準:
- ユーザーが体重を数値で言及 → weight_record を追加
- ユーザーが食事内容を言及（写真・テキスト問わず）→ meal_record を追加
- 食事のカロリー・PFCが不明な場合は日本食の標準データから推定
- 「朝」「起きて」「起床後」→ time_of_day: "morning"
- 「夜」「寝る前」「就寝前」→ time_of_day: "evening"
- それ以外 → time_of_day: "other"
- 「朝食」「朝ごはん」→ meal_type: "breakfast"
- 「昼食」「ランチ」→ meal_type: "lunch"
- 「夕食」「夕ごはん」「夜ごはん」→ meal_type: "dinner"
- 「間食」「おやつ」「スナック」→ meal_type: "snack"

messageは${trainer.name}のキャラクターに忠実な口調で、1〜3文程度で自然に話す。`
}

// ────────────────────────────────────────────────────
// AIレスポンスをパース
// ────────────────────────────────────────────────────
export function parseAIResponse(content) {
  try {
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) return { message: content, actions: [] }
    const parsed = JSON.parse(match[0])
    return {
      message: parsed.message ?? '',
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    }
  } catch {
    return { message: content, actions: [] }
  }
}

// ────────────────────────────────────────────────────
// テキストチャット送信
// ────────────────────────────────────────────────────
export async function sendChatMessage(messages, trainer, userContext) {
  if (!OPENAI_API_KEY) {
    return { message: 'APIキーが設定されていません。', actions: [] }
  }

  const systemPrompt = buildSystemPrompt(trainer, userContext)

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 400,
        temperature: 0.8,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('OpenAI error:', data.error?.message)
      return { message: 'エラーが発生しました。しばらく待ってから再試行してください。', actions: [] }
    }

    const content = data.choices?.[0]?.message?.content?.trim() ?? ''
    return parseAIResponse(content)
  } catch (err) {
    console.error('Chat error:', err)
    return { message: 'ネットワークエラーが発生しました。', actions: [] }
  }
}

// ────────────────────────────────────────────────────
// 画像付きチャット送信（食事写真解析）
// ────────────────────────────────────────────────────
export async function sendChatMessageWithImage(messages, trainer, userContext, imageBase64) {
  if (!OPENAI_API_KEY) {
    return { message: 'APIキーが設定されていません。', actions: [] }
  }

  const systemPrompt = buildSystemPrompt(trainer, userContext)
  const lastUserMsg = messages[messages.length - 1]

  const imageMessage = {
    role: 'user',
    content: [
      {
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: 'low' },
      },
      {
        type: 'text',
        text: lastUserMsg?.content || 'この食事を記録してください',
      },
    ],
  }

  const apiMessages = [
    ...messages.slice(0, -1),
    imageMessage,
  ]

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 500,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          ...apiMessages,
        ],
      }),
    })

    const data = await res.json()
    if (!res.ok) return { message: 'エラーが発生しました。', actions: [] }
    const content = data.choices?.[0]?.message?.content?.trim() ?? ''
    return parseAIResponse(content)
  } catch {
    return { message: 'ネットワークエラーが発生しました。', actions: [] }
  }
}

// ────────────────────────────────────────────────────
// 起動時グリーティング（ローカル生成・API不使用）
// ────────────────────────────────────────────────────
export function getLocalGreeting(trainer, userContext) {
  const { nickname = '', streak = 0, hasRecordedToday = false } = userContext
  const hour = new Date().getHours()
  const timeGreet = hour < 10 ? 'おはよう' : hour < 17 ? 'こんにちは' : 'こんばんは'
  const name = nickname ? `、${nickname}` : ''

  const greetings = {
    ryuya: {
      fresh: `${timeGreet}${name}。今日も記録をサボるなよ。体重と食事、ちゃんと報告しろ。${streak > 0 ? `${streak}日連続か、まあ悪くない。` : ''}`,
      done:  `${timeGreet}${name}。今日はもう記録済みだな。次の目標に向けて気を緩めるな。`,
    },
    yoko: {
      fresh: `${timeGreet}${name}！✨ 今日も一緒に頑張ろうね〜！体重か食事、記録してみて？${streak > 0 ? `${streak}日連続すごい！🎉` : ''}`,
      done:  `${timeGreet}${name}！今日の記録もうバッチリだね💪 すごい！調子はどう？`,
    },
    takumi: {
      fresh: `${timeGreet}${name}。データ記録を開始します。体重か食事の記録から始めましょう。${streak > 0 ? `${streak}日連続記録中。継続は力です。` : ''}`,
      done:  `${timeGreet}${name}。今日のデータは記録済みです。何か質問や相談はありますか？`,
    },
    ren: {
      fresh: `${timeGreet}${name}。修行の時間だ。今日の体重を報告しろ。${streak > 0 ? `${streak}日…まだまだ序の口。` : '限界を超えていこう。'}`,
      done:  `${timeGreet}${name}。今日の記録は完了した。だが満足するな。次のステージに進め。`,
    },
    sakura: {
      fresh: `${timeGreet}${name}🌸 今日も一緒にゆっくり進もう。体重か食事、記録してみて？${streak > 0 ? `${streak}日も続いてるね、素晴らしいよ！` : ''}`,
      done:  `${timeGreet}${name}🌸 今日の記録できてるね！えらい！何か話したいことある？`,
    },
    kenta: {
      fresh: `${timeGreet}${name}！今日もやってくか〜！体重か飯、どっか記録しちゃおうぜ！${streak > 0 ? `おっ、${streak}日連続じゃん！マジやばくね？` : ''}`,
      done:  `${timeGreet}${name}！今日の記録済みじゃん、最高〜！何か話す？`,
    },
  }

  const trainerGreets = greetings[trainer.code] ?? greetings['kenta']
  return hasRecordedToday ? trainerGreets.done : trainerGreets.fresh
}
