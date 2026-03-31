import apiClient from './client';

export interface Test {
  id: string;
  exam_id: string;
  title: string;
  description: string | null;
  test_type: string;
  total_marks: number;
  duration_minutes: number;
  negative_marking_pct: number;
  is_published: boolean;
}

export interface TestAttempt {
  id: string;
  user_id: string;
  test_id: string;
  status: string;
  auto_submitted: boolean;
  total_score: number;
  max_score: number;
  accuracy_pct: number;
  time_taken_seconds: number;
  section_scores: Record<string, number> | null;
  rank: number | null;
  created_at: string;
}

export interface TestQuestion {
  id: string;
  question_id: string;
  order: number;
  marks: number;
  section: string | null;
  question_text: string;
  question_type: string;
  difficulty: number;
  options: Record<string, string>;
}

export interface AttemptStartData {
  attempt: TestAttempt;
  questions: TestQuestion[];
  duration_minutes: number;
  negative_marking_pct: number;
  instructions: string | null;
}

export interface TestAttemptResult {
  attempt: TestAttempt;
  answers: {
    question_id: string;
    selected_answer: string[] | null;
    is_correct: boolean | null;
    correct_answer: string[];
    explanation: string | null;
    marks_awarded: number;
  }[];
}

export const testsAPI = {
  list: () => apiClient.get<{ data: Test[] }>('/tests'),

  getById: (id: string) => apiClient.get<{ data: Test }>(`/tests/${id}`),

  startAttempt: (testId: string) =>
    apiClient.post<{ data: AttemptStartData }>(
      `/tests/${testId}/start`
    ),

  submitAnswer: (attemptId: string, data: {
    question_id: string;
    selected_answer: string[];
    time_taken_seconds: number;
  }) => apiClient.post(`/tests/attempts/${attemptId}/answer`, data),

  submitTest: (attemptId: string) =>
    apiClient.post<{ data: TestAttemptResult }>(
      `/tests/attempts/${attemptId}/submit`
    ),

  getResults: (attemptId: string) =>
    apiClient.get<{ data: TestAttemptResult }>(
      `/tests/attempts/${attemptId}/results`
    ),

  getHistory: () =>
    apiClient.get<{ data: TestAttempt[] }>('/tests/attempts'),
};
