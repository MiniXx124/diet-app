import { supabase } from './supabase'

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const STORAGE_BUCKET = 'trainer-images'

// ─────────────────────────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────────────────────────
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

// ─────────────────────────────────────────────────────────────
// アートスタイル定義（ポケモンキャラデザ風 × ジムトレーナー）
//
// 参考画像から抽出した核心的特徴:
//   - クリーンで太めのアウトライン（黒の中太ライン）
//   - フラットなセルシェーディング（2-3段階、ペインタリーNG）
//   - 明るくクリアな配色
//   - 正面向き上半身ポートレート（顔・胸元まで）
//   - 大きくて表現力のあるシンプルな瞳（単一ハイライト）
//   - 髪はクリーンな形状で定義されたストランド
//   - シンプルで明るいジム背景
// ─────────────────────────────────────────────────────────────
const ART_STYLE = `
A single anime-style illustration of ONE gym personal trainer character standing in a gym. Japanese RPG trainer character art style.

CRITICAL - SINGLE CHARACTER ONLY: The image contains EXACTLY ONE character. NO split panels. NO side-by-side layouts. NO multiple views. NO before/after. NO dual images. NO portrait inset. ONE person, ONE scene, ONE frame only.

CRITICAL ORIENTATION: The character is ALWAYS standing upright, ALWAYS facing forward (front-facing or very slight 3/4 angle). NEVER lying down, NEVER tilted, NEVER rotated sideways. RIGHT-SIDE UP at all times.

CRITICAL COMPOSITION: The character is centered in the image. Show the full head (with clear space above the hair) down to mid-thigh level. The top of the head must NOT be cut off. Leave visible margin above the hair. Bottom of frame cuts at mid-thigh. The character fills the vertical center of the image naturally.

CRITICAL BACKGROUND: A bright, clean, modern gym interior fully behind the character. Light warm-gray or white walls, large windows with soft natural daylight, faint blurred gym equipment (treadmills, mirrors, weight racks) visible in the background. NO dark backgrounds, NO plain gradients, NO blank white background, NO dramatic shadows, NO vivid saturated backgrounds. Must look like a real bright gym environment.

Art style: Clean bold outlines with medium-thick black linework. Flat cel-shading with 2-3 tone levels per color, no painterly gradients, no soft blending. Bright clean character colors.
`.trim()

// ─────────────────────────────────────────────────────────────
// トレーナー固有設定（衣装カラーテーマのみ固定、外見はランダム）
// ─────────────────────────────────────────────────────────────
const TRAINER_CONFIG = {
  ryuya: {
    gender: 'male',
    primary: 'black',
    accent: 'red',
    clothingStyle: 'intense, competitive, sharp',
    personality: 'a strict and demanding personal trainer who pushes clients to their limits',
  },
  yoko: {
    gender: 'female',
    primary: 'bright orange-yellow',
    accent: 'white',
    clothingStyle: 'cheerful, energetic, vibrant',
    personality: 'a bubbly and encouraging fitness influencer who makes training fun',
  },
  takumi: {
    gender: 'male',
    primary: 'navy blue',
    accent: 'white',
    clothingStyle: 'smart, clean, professional',
    personality: 'an analytical sports scientist trainer who coaches with data and precision',
  },
  ren: {
    gender: 'male',
    primary: 'dark charcoal black',
    accent: 'dark crimson',
    clothingStyle: 'minimal, intense, no-nonsense',
    personality: 'a stoic former martial artist trainer with iron discipline',
  },
  sakura: {
    gender: 'female',
    primary: 'soft rose pink',
    accent: 'white',
    clothingStyle: 'gentle, elegant, feminine',
    personality: 'a nurturing wellness coach who supports clients with patience and empathy',
  },
  kenta: {
    gender: 'male',
    primary: 'emerald green',
    accent: 'black',
    clothingStyle: 'casual, streetwear-influenced, relaxed',
    personality: 'a laid-back reformed rebel who makes clients feel like training with a buddy',
  },
}

// ─────────────────────────────────────────────────────────────
// ランダム要素プール
// ─────────────────────────────────────────────────────────────

// ── ポーズ（上半身ポートレート、全て正面向き直立） ──
const POSES = [
  'one hand relaxed on hip, other arm hanging naturally, confident upright posture',
  'arms crossed over chest, looking directly at the camera',
  'one hand raised giving a thumbs up toward the camera',
  'holding a water bottle in one hand at chest level',
  'both hands on hips, power pose, facing forward',
  'one hand on chin in a thoughtful coaching pose',
  'one arm slightly raised, open palm gesturing toward the viewer encouragingly',
  'hands clasped together at chest level, calm and ready',
  'one fist lightly clenched at side, other hand relaxed, confident stance',
  'holding a gym towel over one shoulder with one hand, looking forward',
  'slight casual lean, one elbow bent, friendly approachable posture',
  'arms relaxed at sides, standing straight, clean neutral pose',
]

// ── 表情（mood連動） ──
const EXPRESSIONS = {
  hyped: [
    'extremely excited wide grin showing teeth, eyes sparkling with pure joy, eyebrows raised high',
    'ecstatic open-mouth laugh, fist-pumping energy radiating from the face',
    'beaming ear-to-ear smile with squinted happy eyes, peak enthusiasm',
  ],
  motivated: [
    'confident warm smile, bright focused eyes, encouraging and supportive look',
    'determined grin with a knowing look, eyebrows slightly raised',
    'friendly smile with sharp clear eyes, ready to motivate',
    'relaxed genuine smile, approachable and kind expression',
  ],
  normal: [
    'pleasant calm smile, relaxed and content expression',
    'gentle half-smile, composed and easygoing',
    'soft neutral expression with a slight friendly smile',
  ],
  concerned: [
    'slightly worried look, one eyebrow raised, eyes showing gentle concern',
    'mild frown with caring soft eyes, head tilted slightly to one side',
    'uncertain expression with pressed lips, showing thoughtful worry',
  ],
  disappointed: [
    'downward gaze with a gentle frown, subdued quiet energy',
    'closed-mouth expression with lowered eyebrows, quietly let down',
    'looking slightly aside with a soft sigh expression, shoulders slightly dropped',
  ],
  angry: [
    'stern intense gaze, deeply furrowed brows, tight set jaw',
    'sharp eyes with a firm frown, arms crossed tightly, tense posture',
    'fierce scowl with drawn-together eyebrows, radiating strictness',
  ],
}

// ── 肌色 ──
const SKIN_TONES = [
  'fair light skin',
  'warm light-medium skin with a healthy glow',
  'medium tan skin',
  'warm olive-toned skin',
]

// ── 体型 ──
const BODY_TYPES_MALE = [
  'lean athletic build with well-defined muscles',
  'muscular broad-shouldered physique',
  'slim toned build with visible arm definition',
  'solid athletic build with balanced proportions',
]
const BODY_TYPES_FEMALE = [
  'slim toned athletic build with lean defined arms',
  'fit runner physique with a light athletic frame',
  'athletic build with balanced natural proportions and a fuller chest',
  'lean flexible build with long limbs and a light frame',
  'muscular athletic build with broad shoulders and strong arms',
  'curvy athletic build with defined waist and strong arms',
]

// ── 髪型 ──
const HAIR_STYLES_MALE = [
  'short spiky hair with natural volume',
  'swept-back medium-length hair',
  'short cropped hair with fade on the sides',
  'messy textured medium hair falling naturally',
  'neat short hair parted to one side',
]
const HAIR_STYLES_FEMALE = [
  'long hair tied in a high sporty ponytail',
  'shoulder-length hair with soft side bangs',
  'long flowing hair loose behind the shoulders',
  'medium hair in a practical messy bun on top',
  'short stylish bob cut with side-swept bangs',
]

// ── 髪色 ──
const HAIR_COLORS = [
  'jet black', 'dark brown', 'warm chestnut brown', 'ash brown',
  'honey blonde', 'auburn', 'dark navy-tinted black', 'soft caramel brown',
]

// ── 瞳の色 ──
const EYE_COLORS = [
  'warm brown', 'dark chocolate brown', 'hazel', 'amber',
  'clear blue', 'emerald green', 'gray-blue', 'golden brown',
]

// ── ジムウェア ──
const GYM_WEAR_MALE = [
  'a fitted compression tank top and athletic training shorts',
  'a sleeveless muscle tee and fitted compression leggings',
  'a dry-fit performance t-shirt and athletic running shorts',
  'a fitted half-zip athletic vest over a compression shirt with jogger pants',
  'a compression long-sleeve shirt pushed up at the sleeves and training shorts',
  'a loose-fit tank top and tapered training pants',
]
const GYM_WEAR_FEMALE = [
  'a sports bra and high-waisted athletic leggings',
  'a fitted crop tank top and training leggings',
  'a racerback athletic tank top and compression shorts',
  'a long-sleeve athletic crop top and high-waisted leggings',
  'a fitted athletic t-shirt and training shorts',
  'a half-zip sports jacket open over a sports bra with leggings',
]

// ── シューズ ──
const SHOES = [
  'clean white athletic training shoes',
  'black and white cross-training sneakers',
  'colorful modern running shoes',
  'minimal flat-sole training shoes',
  'high-top athletic sneakers',
]

// ── ジム小物（2つ選ばれる） ──
const ACCESSORIES = [
  'a fitness tracker watch on the wrist',
  'a gym towel draped over one shoulder',
  'black athletic wrist wraps',
  'wireless earbuds resting around the neck',
  'fingerless training gloves',
  'a thin sweat-wicking headband',
  'a resistance band hanging from one hand',
  'a water bottle held in one hand',
  'a small lanyard whistle around the neck',
  'a simple sweatband on one wrist',
]

// ─────────────────────────────────────────────────────────────
// プロンプトビルダー（毎回異なるプロンプトを生成）
// ─────────────────────────────────────────────────────────────
export function buildTrainerPrompt(trainerCode, mood = 'motivated') {
  const cfg = TRAINER_CONFIG[trainerCode]
  if (!cfg) throw new Error(`Unknown trainer: ${trainerCode}`)

  const isMale     = cfg.gender === 'male'
  const genderWord = isMale ? 'young man' : 'young woman'

  // ランダム要素を選択
  const pose       = pick(POSES)
  const expression = pick(EXPRESSIONS[mood] ?? EXPRESSIONS.normal)
  const skinTone   = pick(SKIN_TONES)
  const bodyType   = pick(isMale ? BODY_TYPES_MALE : BODY_TYPES_FEMALE)
  const hairStyle  = pick(isMale ? HAIR_STYLES_MALE : HAIR_STYLES_FEMALE)
  const hairColor  = pick(HAIR_COLORS)
  const eyeColor   = pick(EYE_COLORS)
  const gymWear    = pick(isMale ? GYM_WEAR_MALE : GYM_WEAR_FEMALE)
  const shoes      = pick(SHOES)
  const [acc1, acc2] = pickN(ACCESSORIES, 2)

  return `
${ART_STYLE}

Character: A ${isMale ? 'young man' : 'young woman'} who is ${cfg.personality}.
Body: ${bodyType}, ${skinTone}.
Hair: ${hairStyle}, ${hairColor} colored.
Eyes: large expressive anime-style eyes, ${eyeColor} irises with a single bright white highlight. Simple clean eye shape.
Face: clean anime-proportioned features, well-balanced, facing directly toward the viewer.

Outfit: ${gymWear} in ${cfg.primary} with ${cfg.accent} accents. Style is ${cfg.clothingStyle}. Realistic modern gym wear only, no fantasy elements.
Accessories: ${acc1} and ${acc2}.

Arm/pose: ${pose}.
Expression: ${expression}.

FINAL REMINDER: ONE single character only — NO split panels, NO multiple views, NO dual images. Character is UPRIGHT, FACING FORWARD, CENTERED. Full head visible with space above the hair. Show from head down to mid-thigh. Bright gym interior background behind the character. Professional gym trainer anime character, clean flat cel-shading.
`.trim()
}

// ─────────────────────────────────────────────────────────────
// DALL-E 3 HD で生成 → base64 取得
// ─────────────────────────────────────────────────────────────
async function generateImageBase64(prompt) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:           'dall-e-3',
      prompt,
      n:               1,
      size:            '1024x1024',     // 正方形（上半身ポートレート用）
      quality:         'standard',
      style:           'vivid',
      response_format: 'b64_json',
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('DALL-E 3 error:', data.error?.message)
    throw new Error(data.error?.message ?? 'Image generation failed')
  }

  return data.data?.[0]?.b64_json ?? null
}

// ─────────────────────────────────────────────────────────────
// Supabase Storage にアップロード → 公開URL を返す
// タイムスタンプ付きファイル名でCDNキャッシュを確実にバイパス
// ─────────────────────────────────────────────────────────────
async function uploadToStorage(userId, trainerCode, base64Data) {
  await supabase.storage.createBucket(STORAGE_BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10MB（縦長画像は大きくなる）
  }).catch(() => {})

  const byteString  = atob(base64Data)
  const arrayBuffer = new ArrayBuffer(byteString.length)
  const uint8Array  = new Uint8Array(arrayBuffer)
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i)
  }
  const blob = new Blob([arrayBuffer], { type: 'image/png' })

  const ts       = Date.now()
  const filePath = `${userId}/${trainerCode}_${ts}.png`

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, blob, {
      contentType: 'image/png',
      upsert:      false,
    })

  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath)

  return publicUrl
}

// ─────────────────────────────────────────────────────────────
// メイン：動的プロンプト生成 → DALL-E 3 → アップロード → DB保存
// ─────────────────────────────────────────────────────────────
export async function generateAndStoreTrainerImage(userId, trainerCode, mood = 'motivated') {
  // 1. 動的プロンプト生成（毎回異なる）
  const prompt = buildTrainerPrompt(trainerCode, mood)
  console.log('[TrainerImage] Generated prompt for', trainerCode, '(mood:', mood, ')')
  console.log('[TrainerImage] Prompt length:', prompt.length, 'chars')

  // 2. DALL-E 3 HD で生成（base64）
  const base64 = await generateImageBase64(prompt)
  if (!base64) throw new Error('No image data returned')
  console.log('[TrainerImage] Image generated, base64 size:', Math.round(base64.length * 0.75 / 1024), 'KB')

  // 3. Supabase Storage にアップロード
  const publicUrl = await uploadToStorage(userId, trainerCode, base64)
  console.log('[TrainerImage] Uploaded to:', publicUrl)

  // 4. user_trainers テーブルに保存
  await supabase
    .from('user_trainers')
    .update({ trainer_image_url: publicUrl })
    .eq('user_id', userId)
    .eq('is_current', true)

  return publicUrl
}

// ─────────────────────────────────────────────────────────────
// 画像が既にあればそのまま返す、なければ生成する
// ─────────────────────────────────────────────────────────────
export async function ensureTrainerImage(userId, trainerCode, existingUrl, mood = 'motivated') {
  if (existingUrl) return existingUrl
  return await generateAndStoreTrainerImage(userId, trainerCode, mood)
}
