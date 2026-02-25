export const SHOP_ITEMS = [
  // ── スペシャル ─────────────────────────────────
  {
    id: 'streak_freeze',
    emoji: '🧊',
    name: 'ストリークフリーズ',
    description: '1日サボっても連続記録が途切れない。インベントリから使用できます。',
    price: 500,
    category: 'special',
    maxOwn: 5,
  },
  {
    id: 'double_exp',
    emoji: '⚡',
    name: 'EXPブースト',
    description: '次回の体重記録でEXP獲得量が2倍になる（1回使い切り）',
    price: 800,
    category: 'special',
    maxOwn: 3,
  },
  {
    id: 'bonus_points',
    emoji: '💰',
    name: 'ポイントパック',
    description: '購入すると即座に500ptボーナスが付与される',
    price: 300,
    category: 'special',
    maxOwn: 99,
    immediate: true, // 購入即効果
  },

  // ── 称号 ────────────────────────────────────────
  {
    id: 'title_challenger',
    emoji: '🔥',
    name: '称号「チャレンジャー」',
    description: 'プロフィールに特別な称号が表示される',
    price: 1000,
    category: 'title',
    maxOwn: 1,
  },
  {
    id: 'title_legend',
    emoji: '👑',
    name: '称号「レジェンド」',
    description: 'ダッシュボードのヘッダーに王冠称号が輝く',
    price: 3000,
    category: 'title',
    maxOwn: 1,
  },
  {
    id: 'title_iron',
    emoji: '⚙️',
    name: '称号「アイアン」',
    description: '鋼の意志を持つ継続者の証',
    price: 2000,
    category: 'title',
    maxOwn: 1,
  },

  // ── コスメ ──────────────────────────────────────
  {
    id: 'frame_gold',
    emoji: '🥇',
    name: 'ゴールドフレーム',
    description: 'トレーナーアイコンにゴールドの光沢フレームが付く',
    price: 1500,
    category: 'cosmetic',
    maxOwn: 1,
  },
  {
    id: 'frame_rainbow',
    emoji: '🌈',
    name: 'レインボーフレーム',
    description: 'トレーナーアイコンにレインボーグラデーションフレームが付く',
    price: 5000,
    category: 'cosmetic',
    maxOwn: 1,
  },
]

export const CATEGORY_LABELS_SHOP = {
  special:  '⚡ スペシャル',
  title:    '👑 称号',
  cosmetic: '🎨 コスメ',
}
