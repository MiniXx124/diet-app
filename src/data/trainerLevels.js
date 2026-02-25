// トレーナーレベル定義（trainer_levels テーブルと同期）
export const TRAINER_LEVELS = [
  { level: 30,  name: '神話',             required: 7500,  isNegative: false },
  { level: 25,  name: '超人',             required: 5000,  isNegative: false },
  { level: 20,  name: 'レジェンド',       required: 3500,  isNegative: false },
  { level: 18,  name: 'グランドマスター', required: 2500,  isNegative: false },
  { level: 15,  name: 'マスター',         required: 1800,  isNegative: false },
  { level: 12,  name: 'エリート',         required: 1200,  isNegative: false },
  { level: 10,  name: '上級トレーナー',   required: 700,   isNegative: false },
  { level: 5,   name: '中堅トレーナー',   required: 300,   isNegative: false },
  { level: 3,   name: '一人前',           required: 100,   isNegative: false },
  { level: 1,   name: '見習いトレーナー', required: 0,     isNegative: false },
  { level: -1,  name: '堕落開始',         required: -50,   isNegative: true  },
  { level: -3,  name: '荒廃中',           required: -200,  isNegative: true  },
  { level: -5,  name: '廃人寸前',         required: -500,  isNegative: true  },
  { level: -10, name: 'ゾンビ状態',       required: -9999, isNegative: true  },
]

// レベル値からレベル名を取得
export function getLevelName(levelValue) {
  return TRAINER_LEVELS.find(l => l.level === levelValue)?.name ?? `Lv.${levelValue}`
}

// 次のレベルへの進捗情報を取得
export function getProgressInfo(netScore, currentLevel) {
  const sorted = [...TRAINER_LEVELS].sort((a, b) => a.required - b.required)
  const currentData = sorted.find(l => l.level === currentLevel)
  const nextData = sorted.find(l => l.required > (currentData?.required ?? 0))

  if (!currentData) return { progress: 0, nextLevelName: null, nextRequired: null }
  if (!nextData) return { progress: 100, nextLevelName: null, nextRequired: null } // 最大レベル

  const range = nextData.required - currentData.required
  const gained = netScore - currentData.required
  const progress = Math.min(Math.max((gained / range) * 100, 0), 100)

  return {
    progress,
    nextLevelName: nextData.name,
    nextLevelValue: nextData.level,
    nextRequired: nextData.required,
    pointsNeeded: nextData.required - netScore,
  }
}
