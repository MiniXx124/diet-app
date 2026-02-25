import { create } from 'zustand'
import { calculatePersonalityType } from '../data/diagnosisQuestions'

export const useDiagnosisStore = create((set, get) => ({
  // answers[questionIndex] = { type: 'perfectionist' | ... }
  answers: new Array(30).fill(null),
  personalityType: null,
  selectedTrainer: null,

  setAnswer: (questionIndex, type) => {
    const answers = [...get().answers]
    answers[questionIndex] = { type }
    set({ answers })
  },

  calculateAndSetType: () => {
    const answers = get().answers.filter(Boolean)
    const type = calculatePersonalityType(answers)
    set({ personalityType: type })
    return type
  },

  setSelectedTrainer: (trainer) => set({ selectedTrainer: trainer }),

  reset: () => set({
    answers: new Array(30).fill(null),
    personalityType: null,
    selectedTrainer: null,
  }),
}))
