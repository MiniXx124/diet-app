const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

// ── 共通プロンプト ─────────────────────────────────────────────
const NUTRITION_JSON_FORMAT = `
必ずJSONのみを返してください（説明・マークダウン不要）。
形式: {"calories":数値,"protein":数値,"fat":数値,"carbs":数値}
単位: calories=kcal、protein/fat/carbs=g（すべて整数）
日本食の一般的な1食分として推定してください。`

// ── テキストから栄養情報を推定 ─────────────────────────────────
export async function analyzeFoodFromText(foodName) {
  if (!foodName.trim()) return null

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 80,
      messages: [{
        role: 'user',
        content: `食品名「${foodName}」の栄養情報を推定してください。${NUTRITION_JSON_FORMAT}`,
      }],
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    console.error('OpenAI API error:', data.error?.message ?? res.status)
    return null
  }
  return parseNutrition(data)
}

// ── 写真から食品名＋栄養情報を推定 ────────────────────────────
export async function analyzeFoodFromImage(imageFile) {
  const base64 = await toBase64(imageFile)
  const mimeType = imageFile.type || 'image/jpeg'

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 120,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'low' },
          },
          {
            type: 'text',
            text: `この食事の写真を見て、料理名と栄養情報を推定してください。
必ずJSONのみを返してください（説明不要）。
形式: {"food_name":"料理名","calories":数値,"protein":数値,"fat":数値,"carbs":数値}
単位: calories=kcal、protein/fat/carbs=g（整数）`,
          },
        ],
      }],
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('OpenAI API error (image):', data.error?.message ?? res.status)
    return null
  }
  const text = data.choices?.[0]?.message?.content ?? ''
  if (!text) return null
  try {
    const json = JSON.parse(text.match(/\{[\s\S]*?\}/)?.[0] ?? '{}')
    const calories = parseInt(json.calories)
    if (!calories || calories <= 0) return null
    return {
      food_name: json.food_name ?? '',
      calories,
      protein:   parseFloat(json.protein) || 0,
      fat:       parseFloat(json.fat)     || 0,
      carbs:     parseFloat(json.carbs)   || 0,
    }
  } catch {
    return null
  }
}

// ── PFCバランス判定 ─────────────────────────────────────────────
// 推奨比率: P:15-20%, F:20-30%, C:50-65%
export function analyzePFCBalance(totalProtein, totalFat, totalCarbs) {
  const pCal = totalProtein * 4
  const fCal = totalFat    * 9
  const cCal = totalCarbs  * 4
  const total = pCal + fCal + cCal
  if (total === 0) return null

  const pPct = Math.round(pCal / total * 100)
  const fPct = Math.round(fCal / total * 100)
  const cPct = 100 - pPct - fPct

  const warnings = []
  if (pPct < 12)  warnings.push({ level: 'warn', text: 'タンパク質が少なめです（目標:15〜20%）' })
  if (fPct > 35)  warnings.push({ level: 'bad',  text: '脂質の摂りすぎに注意（目標:20〜30%）' })
  if (cPct > 70)  warnings.push({ level: 'warn', text: '炭水化物が多めです（目標:50〜65%）' })
  if (pPct >= 15 && fPct >= 20 && fPct <= 30 && cPct >= 50 && cPct <= 65) {
    warnings.push({ level: 'good', text: 'PFCバランス良好です👍' })
  }

  return { pPct, fPct, cPct, warnings }
}

// ── ヘルパー ────────────────────────────────────────────────────
async function toBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result.split(',')[1])
    reader.readAsDataURL(file)
  })
}

function parseNutrition(data) {
  if (data.error) {
    console.error('OpenAI error:', data.error.message)
    return null
  }
  const text = data.choices?.[0]?.message?.content ?? ''
  if (!text) return null
  try {
    const json = JSON.parse(text.match(/\{[\s\S]*?\}/)?.[0] ?? '{}')
    const calories = parseInt(json.calories)
    if (!calories || calories <= 0) return null  // 0kcalは明らかにエラー
    return {
      calories,
      protein:  parseFloat(json.protein) || 0,
      fat:      parseFloat(json.fat)     || 0,
      carbs:    parseFloat(json.carbs)   || 0,
    }
  } catch {
    return null
  }
}
