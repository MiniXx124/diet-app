// 6人のトレーナー定義（IDはSupabaseのseed SQLと一致させる）

export const TRAINERS = [
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567001',
    code: 'ryuya',
    name: '竜也',
    kana: 'りゅうや',
    title: 'スパルタコーチ',
    emoji: '💪',
    gradient: 'from-red-500 to-orange-600',
    lightBg: 'bg-red-50',
    border: 'border-red-200',
    accentText: 'text-red-600',
    description: '元プロボクサー。厳しいが確実に結果を出す。甘えは一切許さないが、努力する者には全力でサポートする。',
    quote: '甘えは捨てろ。数字が全てだ。',
    personality: '厳格・論理的・結果重視',
    strictness: 9,
    friendliness: 5,
    bestFor: ['perfectionist', 'athlete', 'procrastinator'],
    tags: ['#厳しい', '#結果重視', '#追い込み'],
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567002',
    code: 'yoko',
    name: '陽子',
    kana: 'ようこ',
    title: 'ポジティブコーチ',
    emoji: '🌟',
    gradient: 'from-yellow-400 to-orange-500',
    lightBg: 'bg-yellow-50',
    border: 'border-yellow-200',
    accentText: 'text-yellow-600',
    description: 'フィットネスインフルエンサー出身。楽しくなければ続かない！をモットーに、笑顔でサポートする。',
    quote: '毎日ちょっとずつ、必ず変われるよ！',
    personality: '明るい・励ます・共感力高い',
    strictness: 4,
    friendliness: 10,
    bestFor: ['hunter', 'flipper', 'dreamer'],
    tags: ['#ポジティブ', '#楽しく', '#SNS映え'],
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567003',
    code: 'takumi',
    name: '拓海',
    kana: 'たくみ',
    title: 'データ分析コーチ',
    emoji: '📊',
    gradient: 'from-blue-500 to-indigo-600',
    lightBg: 'bg-blue-50',
    border: 'border-blue-200',
    accentText: 'text-blue-600',
    description: '栄養学・運動科学の博士。最新の研究データに基づいた指導で、科学的に最短ルートを導き出す。',
    quote: 'データは嘘をつかない。理論で攻略しよう。',
    personality: '論理的・科学的・精密',
    strictness: 7,
    friendliness: 6,
    bestFor: ['data_lover', 'perfectionist', 'athlete'],
    tags: ['#科学的', '#データ管理', '#最短ルート'],
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567004',
    code: 'ren',
    name: '蓮',
    kana: 'れん',
    title: '修行系コーチ',
    emoji: '🔥',
    gradient: 'from-rose-600 to-red-800',
    lightBg: 'bg-rose-50',
    border: 'border-rose-200',
    accentText: 'text-rose-600',
    description: '元格闘技選手。肉体と精神の限界を超えることを信条とする。修行の先にある変化を一緒に目指す。',
    quote: '限界を超えた先にしか、本当の変化はない。',
    personality: 'ストイック・精神論・求道者',
    strictness: 10,
    friendliness: 4,
    bestFor: ['athlete', 'procrastinator', 'perfectionist'],
    tags: ['#限界突破', '#修行', '#ガチ勢向け'],
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567005',
    code: 'sakura',
    name: '桜',
    kana: 'さくら',
    title: '優しいメンター',
    emoji: '🌸',
    gradient: 'from-pink-400 to-rose-500',
    lightBg: 'bg-pink-50',
    border: 'border-pink-200',
    accentText: 'text-pink-600',
    description: '産後ダイエット経験者のカウンセラー系コーチ。焦らなくていい、ゆっくり着実に。心の変化を大切にする。',
    quote: '焦らなくていい。一緒にゆっくり進もう。',
    personality: '穏やか・寄り添う・継続重視',
    strictness: 3,
    friendliness: 9,
    bestFor: ['dreamer', 'procrastinator', 'flipper'],
    tags: ['#優しい', '#マイペース', '#ストレスゼロ'],
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567006',
    code: 'kenta',
    name: '健太',
    kana: 'けんた',
    title: '気さくな相棒コーチ',
    emoji: '😎',
    gradient: 'from-emerald-500 to-teal-600',
    lightBg: 'bg-emerald-50',
    border: 'border-emerald-200',
    accentText: 'text-emerald-600',
    description: '元ヤンキーから筋トレにハマってフィットネスの世界へ。タメ口で話す気さくなキャラが人気。仲間感覚で一緒に楽しむ。',
    quote: '楽しくやらないと続かないっしょ！一緒にやろうぜ！',
    personality: 'フレンドリー・カジュアル・仲間感覚',
    strictness: 5,
    friendliness: 8,
    bestFor: ['hunter', 'flipper', 'dreamer'],
    tags: ['#気さく', '#仲間感覚', '#楽しく継続'],
  },
]

// ────────────────────────────────────────────
// DALL-E 3 画像生成プロンプト
// 原神 (Genshin Impact) スタイルに統一
// ※ 実際のHDプロンプトは src/lib/trainerImageGen.js の TRAINER_HD_PROMPTS を参照
// ────────────────────────────────────────────
// (レガシー参照用 - 実運用は trainerImageGen.js の TRAINER_HD_PROMPTS を使用)

// DALL-E 3 生成関数（本番実装時に有効化）
// import OpenAI from 'openai'
// const openai = new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_API_KEY, dangerouslyAllowBrowser: true })
export async function generateTrainerImage(trainerCode, _personalityType) {
  // TODO: 本番実装
  // const prompt = TRAINER_IMAGE_PROMPTS[trainerCode]
  // const response = await openai.images.generate({
  //   model: 'dall-e-3',
  //   prompt,
  //   size: '1024x1024',
  //   quality: 'standard',
  //   n: 1,
  // })
  // return response.data[0].url
  console.log('generateTrainerImage called for:', trainerCode)
  return null
}

// トレーナーコードからオブジェクトを取得
export function getTrainerByCode(code) {
  return TRAINERS.find(t => t.code === code) ?? TRAINERS[0]
}

// タイプに対してのトレーナーを相性順にソート
export function getSortedTrainers(personalityType) {
  return [...TRAINERS].sort((a, b) => {
    const aMatch = a.bestFor.includes(personalityType) ? 1 : 0
    const bMatch = b.bestFor.includes(personalityType) ? 1 : 0
    return bMatch - aMatch
  })
}
