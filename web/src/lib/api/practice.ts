import apiClient from './client';

export interface Question {
  id: string;
  topic_id: string;
  exam_id: string;
  question_text: string;
  question_type: string;
  difficulty: number;
  options: Record<string, string>;
  language: string;
  tags: string[] | null;
  is_verified: boolean;
  times_attempted: number;
  times_correct: number;
  created_at: string;
}

export interface PracticeSession {
  id: string;
  user_id: string;
  exam_id: string | null;
  topic_id: string | null;
  status: string;
  total_questions: number;
  correct_count: number;
  wrong_count: number;
  skipped_count: number;
  total_time_seconds: number;
  is_adaptive: boolean;
  created_at: string;
}

export interface AnswerResult {
  is_correct: boolean;
  correct_answer: string[];
  explanation: string | null;
  xp_earned: number;
}

export interface SessionResult {
  session: PracticeSession;
  total_questions: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracy_pct: number;
  total_time_seconds: number;
  xp_earned: number;
}

export const practiceAPI = {
  createSession: (data: {
    exam_id?: string;
    subject_id?: string;
    topic_id?: string;
    question_count?: number;
    difficulty?: number;
    is_adaptive?: boolean;
  }) => apiClient.post<{ data: PracticeSession }>('/practice/sessions', data),

  getSession: (sessionId: string) =>
    apiClient.get<{ data: { session: PracticeSession; questions: Question[] } }>(
      `/practice/sessions/${sessionId}`
    ),

  submitAnswer: (sessionId: string, data: {
    question_id: string;
    selected_answer: string[];
    time_taken_seconds: number;
  }) => apiClient.post<{ data: AnswerResult }>(
    `/practice/sessions/${sessionId}/answer`,
    data
  ),

  completeSession: (sessionId: string) =>
    apiClient.post<{ data: SessionResult }>(
      `/practice/sessions/${sessionId}/complete`
    ),
};
