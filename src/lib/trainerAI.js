const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

/**
 * トレーナーがパーソナルなアドバイスを生成する
 * @param {object} trainer  - TRAINERS データ（name, personality など）
 * @param {object} context  - { nickname, weightTrend, calories, streak, level, bmi }
 * @returns {Promise<string>} トレーナーのセリフ（1〜2文）
 */
export async function getAITrainerAdvice(trainer, context) {
  if (!OPENAI_API_KEY) return null

  const {
    nickname   = 'あなた',
    weightTrend,   // 数値: 直近7日の変化量 (kg)。null = データなし
    calories,      // 数値: 今日の摂取カロリー。null = 未記録
    streak,        // 数値: 連続記録日数
    level,         // 数値: 現在レベル
    bmi,           // 数値: BMI。null = 未計算
  } = context

  // コンテキストを日本語で組み立て
  const parts = []
  if (streak > 0) parts.push(`${streak}日連続記録中`)
  if (weightTrend !== null && weightTrend !== undefined) {
    if (weightTrend < -0.2) parts.push(`体重が${Math.abs(weightTrend)}kg減少傾向`)
    else if (weightTrend > 0.2) parts.push(`体重が${weightTrend}kg増加傾向`)
    else parts.push('体重は横ばい')
  }
  if (calories !== null && calories !== undefined && calories > 0) {
    if (calories > 2200) parts.push(`今日のカロリーが${calories}kcalでやや過多`)
    else if (calories < 800) parts.push(`今日のカロリーが${calories}kcalと少なめ`)
    else parts.push(`今日のカロリーは${calories}kcal`)
  }
  if (bmi) parts.push(`BMI ${bmi}`)
  parts.push(`レベル${level}`)

  const contextStr = parts.length > 0 ? parts.join('、') : 'データなし'

  const prompt = `
あなたはフィットネスアプリのAIトレーナー「${trainer.name}」です。
性格: ${trainer.personality ?? trainer.description ?? 'やる気を引き出す熱血コーチ'}

ユーザー「${nickname}」への一言アドバイスを日本語で1〜2文で返してください。
ユーザーの状況: ${contextStr}

ルール:
- トレーナーとして自然なセリフ口調で話す（「${trainer.name}」の性格に合わせて）
- 説教や長文は不要。短くポジティブに。
- 名前や「${nickname}」は呼んでいい
- JSON・マークダウン不要、テキストのみ返す
`.trim()

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 120,
        temperature: 0.85,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    if (!res.ok) return null
    return data.choices?.[0]?.message?.content?.trim() ?? null
  } catch {
    return null
  }
}
