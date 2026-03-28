import { create } from 'zustand';
import type { Question, PracticeSession, AnswerResult } from '../api/practice';

interface PracticeState {
  session: PracticeSession | null;
  questions: Question[];
  currentIndex: number;
  answers: Record<string, { selected: string[]; result: AnswerResult | null; timeTaken: number }>;
  startTime: number | null;
  isSubmitting: boolean;

  setSession: (session: PracticeSession, questions: Question[]) => void;
  setAnswer: (questionId: string, selected: string[], result: AnswerResult, timeTaken: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  goToQuestion: (index: number) => void;
  setSubmitting: (v: boolean) => void;
  reset: () => void;
}

export const usePracticeStore = create<PracticeState>((set) => ({
  session: null,
  questions: [],
  currentIndex: 0,
  answers: {},
  startTime: null,
  isSubmitting: false,

  setSession: (session, questions) =>
    set({ session, questions, currentIndex: 0, answers: {}, startTime: Date.now() }),

  setAnswer: (questionId, selected, result, timeTaken) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [questionId]: { selected, result, timeTaken },
      },
    })),

  nextQuestion: () =>
    set((state) => ({
      currentIndex: Math.min(state.currentIndex + 1, state.questions.length - 1),
    })),

  prevQuestion: () =>
    set((state) => ({
      currentIndex: Math.max(state.currentIndex - 1, 0),
    })),

  goToQuestion: (index) => set({ currentIndex: index }),

  setSubmitting: (v) => set({ isSubmitting: v }),

  reset: () =>
    set({
      session: null,
      questions: [],
      currentIndex: 0,
      answers: {},
      startTime: null,
      isSubmitting: false,
    }),
}));
