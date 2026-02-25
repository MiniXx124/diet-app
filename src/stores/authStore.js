import { create } from 'zustand'
import { supabase } from '../lib/supabase'

// profile を個別にフェッチするヘルパー（store外で使う）
async function loadProfile(userId) {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data ?? null
}

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  initialized: false,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      // user と profile を同時にセット（Race Condition を防ぐ）
      const profile = await loadProfile(session.user.id)
      set({ user: session.user, profile })
    }

    set({ initialized: true })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // initialized を一時的に落として Spinner を出し、
        // user + profile が揃ってから initialized を戻す
        set({ initialized: false })
        try {
          const profile = await loadProfile(session.user.id)
          set({ user: session.user, profile, initialized: true })
        } catch {
          // loadProfile失敗時も必ずinitializedをtrueに戻す（無限スピナー防止）
          set({ user: session.user, profile: null, initialized: true })
        }
      } else {
        set({ user: null, profile: null, initialized: true })
      }
    })
  },

  fetchProfile: async (userId) => {
    const profile = await loadProfile(userId)
    if (profile) set({ profile })
  },

  updateProfile: async (userId, updates) => {
    const { data } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    if (data) set({ profile: data })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },
}))
