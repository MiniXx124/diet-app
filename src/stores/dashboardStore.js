import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { TRAINERS } from '../data/trainers'
import { ACHIEVEMENTS } from '../data/achievements'

// 体重1回記録ごとの報酬
const EXP_PER_RECORD    = 10   // exp_points への加算
const POINTS_PER_RECORD = 50   // point_transactions への記録

// 劣化パラメータ
const DECAY_PER_MISS  = 5    // ミス1日あたりのdecay_points加算
const MAX_DECAY_DAYS  = 30   // 一度に適用する最大ミス日数

// 連続記録ボーナス
const STREAK_MILESTONES = [
  { days: 7,  bonus: 500,  label: '7日連続達成！' },
  { days: 14, bonus: 1000, label: '14日連続達成！' },
  { days: 30, bonus: 3000, label: '30日連続達成！' },
]

// ミス日数 → mood マッピング
function calcMood(consecutiveMiss) {
  if (consecutiveMiss === 0) return 'motivated'
  if (consecutiveMiss <= 2)  return 'normal'
  if (consecutiveMiss <= 4)  return 'concerned'
  if (consecutiveMiss <= 6)  return 'disappointed'
  return 'angry'
}

// 連続記録日数を計算（今日から遡って途切れるまでカウント）
function calcConsecutiveDays(records) {
  if (!records.length) return 0
  const recordedDates = new Set(records.map(r => r.recorded_date))
  let count = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    if (recordedDates.has(dateStr)) {
      count++
    } else {
      break
    }
  }
  return count
}

export const useDashboardStore = create((set, get) => ({
  userTrainer: null,
  trainer: null,
  weightRecords: [],
  todayRecords: { morning: null, evening: null },
  totalPoints: 0,
  consecutiveDays: 0,
  loading: false,
  submitting: false,
  error: null,
  levelUpData: null,           // { from: number, to: number } レベルアップ時にセット
  streakBonusData: null,       // { days: number, bonus: number } 連続ボーナス時にセット
  newAchievements: [],         // 新解除されたアチーブメント配列
  unlockedAchievementIds: [],  // 解除済みIDキャッシュ（AchievementsPage用）
  streakFreezeUsed: 0,         // 今回適用されたフリーズ数

  fetchDashboard: async (userId, profile) => {
    set({ loading: true, error: null })
    try {
      // fetchTrainer → checkDecay の順序が必要（劣化チェックにuserTrainerの状態が必要）
      await get().fetchTrainer(userId)
      await get().checkDecay(userId)
      await Promise.all([
        get().fetchWeightRecords(userId),
        get().fetchPoints(userId),
      ])
      // アチーブメント解除チェック（初回ロード時）
      if (profile) await get().checkAchievements(userId, profile)
    } catch (e) {
      set({ error: e.message })
    } finally {
      set({ loading: false })
    }
  },

  // 劣化チェック：前回記録からのミス日数を計算して decay を適用
  checkDecay: async (userId) => {
    const ut = get().userTrainer
    if (!ut || !ut.last_record_at) return

    const lastDate = new Date(ut.last_record_at)
    const today    = new Date()
    lastDate.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)

    const daysSince    = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24))
    const expectedMiss = Math.max(0, daysSince - 1)
    const additionalMiss = expectedMiss - (ut.consecutive_miss ?? 0)

    if (additionalMiss <= 0) return

    // ── ストリークフリーズのチェック ──────────────────────────────
    let actualMiss = additionalMiss
    let freezeUsed = 0
    if (additionalMiss > 0) {
      const { data: freezes } = await supabase
        .from('user_purchases')
        .select('id')
        .eq('user_id', userId)
        .eq('item_id', 'streak_freeze')
        .is('used_at', null)
        .limit(additionalMiss)

      if (freezes && freezes.length > 0) {
        freezeUsed = Math.min(freezes.length, additionalMiss)
        actualMiss = additionalMiss - freezeUsed
        // 使用済みにマーク
        for (const f of freezes.slice(0, freezeUsed)) {
          await supabase.from('user_purchases')
            .update({ used_at: new Date().toISOString() })
            .eq('id', f.id)
        }
        if (freezeUsed > 0) set({ streakFreezeUsed: freezeUsed })
      }
    }

    if (actualMiss <= 0) {
      await get().fetchTrainer(userId)
      return
    }

    const cappedMiss = Math.min(actualMiss, MAX_DECAY_DAYS)
    const newDecay   = (ut.decay_points ?? 0) + DECAY_PER_MISS * cappedMiss
    const newMiss    = (ut.consecutive_miss ?? 0) + cappedMiss
    const newMood    = calcMood(newMiss)

    await supabase
      .from('user_trainers')
      .update({ decay_points: newDecay, consecutive_miss: newMiss, mood: newMood })
      .eq('user_id', userId)
      .eq('is_current', true)

    await get().fetchTrainer(userId)
  },

  fetchTrainer: async (userId) => {
    const { data, error } = await supabase
      .from('user_trainers')
      .select('*')
      .eq('user_id', userId)
      .eq('is_current', true)
      .single()

    if (error || !data) return

    const localTrainer = TRAINERS.find(t => t.id === data.trainer_id) ?? null
    set({
      userTrainer: data,
      trainer: localTrainer ? { ...localTrainer, ...data } : data,
    })
  },

  fetchWeightRecords: async (userId) => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    const fromDate = sevenDaysAgo.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('weight_records')
      .select('id, recorded_date, time_of_day, weight_kg')
      .eq('user_id', userId)
      .gte('recorded_date', fromDate)
      .order('recorded_date', { ascending: true })
      .order('time_of_day', { ascending: true })

    if (error) return

    const records = data ?? []
    const consecutiveDays = calcConsecutiveDays(records)

    const today = new Date().toISOString().split('T')[0]
    const todayRecs = records.filter(r => r.recorded_date === today)
    const todayRecords = {
      morning: todayRecs.find(r => r.time_of_day === 'morning') ?? null,
      evening: todayRecs.find(r => r.time_of_day === 'evening') ?? null,
    }

    set({ weightRecords: records, consecutiveDays, todayRecords })
  },

  fetchPoints: async (userId) => {
    const { data, error } = await supabase
      .from('point_transactions')
      .select('points')
      .eq('user_id', userId)

    if (error || !data) return
    const total = data.reduce((sum, r) => sum + (r.points ?? 0), 0)
    set({ totalPoints: total })
  },

  addWeightRecord: async (userId, timeOfDay, weightKg) => {
    set({ submitting: true, error: null })
    try {
      const today = new Date().toISOString().split('T')[0]
      const isNewRecord = !get().todayRecords[timeOfDay]

      // 1. 体重記録を保存（既存あればupsert）
      const { error: recordError } = await supabase
        .from('weight_records')
        .upsert(
          {
            user_id: userId,
            recorded_date: today,
            time_of_day: timeOfDay,
            weight_kg: parseFloat(weightKg),
            input_method: 'manual',
          },
          { onConflict: 'user_id,recorded_date,time_of_day' }
        )
      if (recordError) throw recordError

      // 2. 新規記録のみ exp + ポイント付与
      if (isNewRecord) {
        const oldLevel   = get().userTrainer?.current_level ?? 1
        const currentExp = get().userTrainer?.exp_points    ?? 0

        // ── EXPブーストチェック ──────────────────────────
        const { data: boost } = await supabase
          .from('user_purchases')
          .select('id')
          .eq('user_id', userId)
          .eq('item_id', 'double_exp')
          .is('used_at', null)
          .limit(1)
          .maybeSingle()

        const expMultiplier = boost ? 2 : 1
        if (boost) {
          await supabase.from('user_purchases')
            .update({ used_at: new Date().toISOString() })
            .eq('id', boost.id)
        }

        await supabase
          .from('user_trainers')
          .update({
            exp_points:       currentExp + EXP_PER_RECORD * expMultiplier,
            last_record_at:   today,
            consecutive_miss: 0,
          })
          .eq('user_id', userId)
          .eq('is_current', true)

        // ポイント履歴を追加
        await supabase
          .from('point_transactions')
          .insert({
            user_id:     userId,
            points:      POINTS_PER_RECORD,
            reason:      'weight_record',
            description: `${timeOfDay === 'morning' ? '朝' : '夜'}の体重記録`,
          })

        // トレーナー情報を再取得（トリガー後の新levelを取得）
        await get().fetchTrainer(userId)

        // レベルアップ検知
        const newLevel = get().userTrainer?.current_level ?? 1
        if (newLevel > oldLevel) {
          set({ levelUpData: { from: oldLevel, to: newLevel } })
        }

        // ポイント合計を更新
        await get().fetchPoints(userId)
      }

      // 体重グラフ・連続日数を更新
      await get().fetchWeightRecords(userId)

      // 連続記録ボーナスチェック（新規記録のみ）
      if (isNewRecord) {
        const currentStreak = get().consecutiveDays
        const milestone = STREAK_MILESTONES.find(m => m.days === currentStreak)
        if (milestone) {
          // 同日・同マイルストーンのボーナスが既に付与済みか確認
          const bonusKey = `streak_${milestone.days}_${today}`
          const { data: existing } = await supabase
            .from('point_transactions')
            .select('id')
            .eq('user_id', userId)
            .eq('reason', 'streak_bonus')
            .eq('description', bonusKey)
            .maybeSingle()

          if (!existing) {
            await supabase.from('point_transactions').insert({
              user_id:     userId,
              points:      milestone.bonus,
              reason:      'streak_bonus',
              description: bonusKey,
            })
            set({ streakBonusData: { days: milestone.days, bonus: milestone.bonus } })
            await get().fetchPoints(userId)
          }
        }
      }
    } finally {
      set({ submitting: false })
    }
  },

  changeTrainer: async (userId, newTrainerId) => {
    // 現在のトレーナーを非アクティブに
    await supabase
      .from('user_trainers')
      .update({ is_current: false })
      .eq('user_id', userId)
      .eq('is_current', true)

    // 新トレーナーのレコードが既に存在するか確認
    const { data: existing } = await supabase
      .from('user_trainers')
      .select('*')
      .eq('user_id', userId)
      .eq('trainer_id', newTrainerId)
      .maybeSingle()

    if (existing) {
      // 過去に使ったトレーナー → そのまま再アクティブ化（ステータス引継ぎ）
      await supabase
        .from('user_trainers')
        .update({ is_current: true })
        .eq('user_id', userId)
        .eq('trainer_id', newTrainerId)
    } else {
      // 初めてのトレーナー → 新規作成
      await supabase.from('user_trainers').insert({
        user_id:          userId,
        trainer_id:       newTrainerId,
        is_current:       true,
        exp_points:       0,
        decay_points:     0,
        current_level:    1,
        consecutive_miss: 0,
        last_record_at:   new Date().toISOString().split('T')[0],
        mood:             'motivated',
      })
    }

    // ダッシュボード全体をリフレッシュ
    await get().fetchDashboard(userId)
  },

  // ── アチーブメントチェック ──────────────────────────────────
  checkAchievements: async (userId, profile) => {
    // DB から解除済みIDを取得
    const { data: rows } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId)

    const alreadyUnlocked = new Set((rows ?? []).map(r => r.achievement_id))
    set({ unlockedAchievementIds: [...alreadyUnlocked] })

    const { weightRecords, consecutiveDays, totalPoints, userTrainer } = get()
    const level = userTrainer?.current_level ?? 1

    // 最新の体重記録（降順）
    const sortedRecords = [...weightRecords].sort((a, b) =>
      b.recorded_date.localeCompare(a.recorded_date) ||
      (b.time_of_day === 'evening' ? 1 : -1)
    )

    const context = { records: sortedRecords, consecutiveDays, totalPoints, level, profile }

    const newlyUnlocked = []
    for (const ach of ACHIEVEMENTS) {
      if (alreadyUnlocked.has(ach.id)) continue
      try {
        if (ach.condition(context)) newlyUnlocked.push(ach)
      } catch {}
    }

    if (newlyUnlocked.length === 0) return

    // DB に一括挿入
    await supabase.from('user_achievements').insert(
      newlyUnlocked.map(a => ({ user_id: userId, achievement_id: a.id }))
    )

    set({
      unlockedAchievementIds: [...alreadyUnlocked, ...newlyUnlocked.map(a => a.id)],
      newAchievements: newlyUnlocked,
    })
  },

  clearNewAchievements: () => set({ newAchievements: [] }),

  clearLevelUp: () => set({ levelUpData: null }),
  clearStreakBonus: () => set({ streakBonusData: null }),
}))
