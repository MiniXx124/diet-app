// ── アチーブメント定義 ────────────────────────────────────────
// condition はチェック時に { records, consecutiveDays, totalPoints, level, profile } を受け取る

export const ACHIEVEMENTS = [
  // ── 記録系 ──────────────────────────────────────
  {
    id: 'first_record',
    emoji: '🌱',
    title: 'はじめの一歩',
    description: '初めて体重を記録した',
    category: 'record',
    condition: ({ records }) => records.length >= 1,
  },
  {
    id: 'record_10',
    emoji: '📝',
    title: '記録マスター初級',
    description: '体重を10回記録した',
    category: 'record',
    condition: ({ records }) => records.length >= 10,
  },
  {
    id: 'record_30',
    emoji: '📒',
    title: '記録マスター中級',
    description: '体重を30回記録した',
    category: 'record',
    condition: ({ records }) => records.length >= 30,
  },
  {
    id: 'record_100',
    emoji: '📚',
    title: '記録マスター上級',
    description: '体重を100回記録した',
    category: 'record',
    condition: ({ records }) => records.length >= 100,
  },
  {
    id: 'morning_and_evening',
    emoji: '☀️🌙',
    title: '朝晩コンビ',
    description: '同じ日に朝と夜の両方を記録した',
    category: 'record',
    condition: ({ records }) => {
      const map = new Map()
      for (const r of records) {
        if (!map.has(r.recorded_date)) map.set(r.recorded_date, new Set())
        map.get(r.recorded_date).add(r.time_of_day)
      }
      return [...map.values()].some(s => s.has('morning') && s.has('evening'))
    },
  },

  // ── 連続記録系 ────────────────────────────────
  {
    id: 'streak_3',
    emoji: '🔥',
    title: '3日坊主を超えた',
    description: '3日連続で体重を記録した',
    category: 'streak',
    condition: ({ consecutiveDays }) => consecutiveDays >= 3,
  },
  {
    id: 'streak_7',
    emoji: '🔥🔥',
    title: '一週間継続',
    description: '7日連続で体重を記録した',
    category: 'streak',
    condition: ({ consecutiveDays }) => consecutiveDays >= 7,
  },
  {
    id: 'streak_14',
    emoji: '🔥🔥🔥',
    title: '2週間の鉄人',
    description: '14日連続で体重を記録した',
    category: 'streak',
    condition: ({ consecutiveDays }) => consecutiveDays >= 14,
  },
  {
    id: 'streak_30',
    emoji: '🏆',
    title: '30日チャンピオン',
    description: '30日連続で体重を記録した',
    category: 'streak',
    condition: ({ consecutiveDays }) => consecutiveDays >= 30,
  },

  // ── ポイント系 ────────────────────────────────
  {
    id: 'points_1000',
    emoji: '⭐',
    title: 'ポイントコレクター',
    description: '累計1,000pt獲得した',
    category: 'points',
    condition: ({ totalPoints }) => totalPoints >= 1000,
  },
  {
    id: 'points_5000',
    emoji: '🌟',
    title: 'ポイントハンター',
    description: '累計5,000pt獲得した',
    category: 'points',
    condition: ({ totalPoints }) => totalPoints >= 5000,
  },
  {
    id: 'points_10000',
    emoji: '💎',
    title: 'ポイントキング',
    description: '累計10,000pt獲得した',
    category: 'points',
    condition: ({ totalPoints }) => totalPoints >= 10000,
  },

  // ── レベル系 ──────────────────────────────────
  {
    id: 'level_5',
    emoji: '💪',
    title: 'トレーナーの卵',
    description: 'トレーナーをLv.5まで育てた',
    category: 'level',
    condition: ({ level }) => level >= 5,
  },
  {
    id: 'level_10',
    emoji: '🦅',
    title: 'トレーナーの相棒',
    description: 'トレーナーをLv.10まで育てた',
    category: 'level',
    condition: ({ level }) => level >= 10,
  },
  {
    id: 'level_20',
    emoji: '👑',
    title: '最強コンビ',
    description: 'トレーナーをLv.20まで育てた',
    category: 'level',
    condition: ({ level }) => level >= 20,
  },

  // ── 目標達成系 ────────────────────────────────
  {
    id: 'goal_set',
    emoji: '🎯',
    title: '目標設定者',
    description: '目標体重を設定した',
    category: 'goal',
    condition: ({ profile }) => !!profile?.target_weight,
  },
  {
    id: 'goal_achieved',
    emoji: '🎉',
    title: '目標達成！',
    description: '目標体重を達成した',
    category: 'goal',
    condition: ({ profile, records }) => {
      if (!profile?.target_weight) return false
      const latest = records[0]?.weight_kg
      if (!latest) return false
      return parseFloat(latest) <= parseFloat(profile.target_weight)
    },
  },
  {
    id: 'weight_down_1',
    emoji: '📉',
    title: 'マイナス1kg',
    description: '最初の記録から1kg減量した',
    category: 'goal',
    condition: ({ profile, records }) => {
      if (!profile?.start_weight) return false
      const latest = records[0]?.weight_kg
      if (!latest) return false
      return parseFloat(profile.start_weight) - parseFloat(latest) >= 1
    },
  },
  {
    id: 'weight_down_5',
    emoji: '🏅',
    title: 'マイナス5kg',
    description: '最初の記録から5kg減量した',
    category: 'goal',
    condition: ({ profile, records }) => {
      if (!profile?.start_weight) return false
      const latest = records[0]?.weight_kg
      if (!latest) return false
      return parseFloat(profile.start_weight) - parseFloat(latest) >= 5
    },
  },

  // ── BMI系 ─────────────────────────────────────
  {
    id: 'bmi_set',
    emoji: '🧮',
    title: '健康チェック開始',
    description: '身長を設定してBMIを確認した',
    category: 'health',
    condition: ({ profile }) => !!profile?.height_cm,
  },
  {
    id: 'bmi_normal',
    emoji: '💚',
    title: '健康体重キープ',
    description: 'BMIが18.5〜24.9の範囲になった',
    category: 'health',
    condition: ({ profile, records }) => {
      if (!profile?.height_cm) return false
      const latest = records[0]?.weight_kg
      if (!latest) return false
      const h = profile.height_cm / 100
      const bmi = parseFloat(latest) / (h * h)
      return bmi >= 18.5 && bmi < 25.0
    },
  },
]

export const CATEGORY_LABELS = {
  record: '📝 記録',
  streak: '🔥 継続',
  points: '⭐ ポイント',
  level:  '💪 レベル',
  goal:   '🎯 目標',
  health: '💚 健康',
}
