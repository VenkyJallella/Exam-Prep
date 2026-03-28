import { create } from 'zustand';
import type { TestAttempt, TestQuestion } from '../api/tests';

interface TestState {
  attempt: TestAttempt | null;
  questions: TestQuestion[];
  currentIndex: number;
  answers: Record<string, { selected: string[]; markedForReview: boolean }>;
  durationMinutes: number;
  negativeMarkingPct: number;
  instructions: string | null;
  startTime: number | null;

  setAttempt: (
    attempt: TestAttempt,
    questions: TestQuestion[],
    durationMinutes: number,
    negativeMarkingPct: number,
    instructions: string | null,
  ) => void;
  setAnswer: (questionId: string, selected: string[]) => void;
  toggleReview: (questionId: string) => void;
  goToQuestion: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  reset: () => void;
}

export const useTestStore = create<TestState>((set) => ({
  attempt: null,
  questions: [],
  currentIndex: 0,
  answers: {},
  durationMinutes: 0,
  negativeMarkingPct: 0,
  instructions: null,
  startTime: null,

  setAttempt: (attempt, questions, durationMinutes, negativeMarkingPct, instructions) =>
    set({
      attempt,
      questions,
      currentIndex: 0,
      answers: {},
      durationMinutes,
      negativeMarkingPct,
      instructions,
      startTime: Date.now(),
    }),

  setAnswer: (questionId, selected) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [questionId]: {
          selected,
          markedForReview: state.answers[questionId]?.markedForReview || false,
        },
      },
    })),

  toggleReview: (questionId) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [questionId]: {
          selected: state.answers[questionId]?.selected || [],
          markedForReview: !state.answers[questionId]?.markedForReview,
        },
      },
    })),

  goToQuestion: (index) => set({ currentIndex: index }),

  nextQuestion: () =>
    set((state) => ({
      currentIndex: Math.min(state.currentIndex + 1, state.questions.length - 1),
    })),

  prevQuestion: () =>
    set((state) => ({
      currentIndex: Math.max(state.currentIndex - 1, 0),
    })),

  reset: () =>
    set({
      attempt: null,
      questions: [],
      currentIndex: 0,
      answers: {},
      durationMinutes: 0,
      negativeMarkingPct: 0,
      instructions: null,
      startTime: null,
    }),
}));
