const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

/**
 * 画像ファイルをbase64に変換する
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // "data:image/jpeg;base64,xxxxx" → "xxxxx" だけ取り出す
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 体重計の画像から体重（kg）を読み取る
 * @param {File} imageFile - カメラ or ファイル選択で取得した画像
 * @returns {number|null} 読み取れた体重（kg）、失敗時はnull
 */
export async function extractWeightFromImage(imageFile) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI APIキーが設定されていません')
  }

  const base64 = await fileToBase64(imageFile)
  const mimeType = imageFile.type || 'image/jpeg'

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: 'low', // コスト削減：低解像度で十分
              },
            },
            {
              type: 'text',
              text: `この体重計の画像に表示されている数値を読み取ってください。
数値のみを返してください（単位や説明は不要）。
例：68.5
読み取れない場合は「null」とだけ返してください。`,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `APIエラー: ${response.status}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content?.trim() ?? ''

  if (text === 'null' || !text) return null

  // 数字と小数点だけ抽出
  const match = text.match(/\d+(\.\d+)?/)
  if (!match) return null

  const kg = parseFloat(match[0])
  if (isNaN(kg) || kg < 20 || kg > 300) return null

  return kg
}
