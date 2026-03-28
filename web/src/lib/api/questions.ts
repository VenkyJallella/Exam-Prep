import apiClient from './client';

export interface QuestionRead {
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

export interface QuestionListParams {
  exam_id?: string;
  topic_id?: string;
  difficulty?: number;
  question_type?: string;
  is_verified?: boolean;
  language?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export const questionsAPI = {
  list: (params?: QuestionListParams) =>
    apiClient.get<{ data: QuestionRead[]; meta: any }>('/questions', { params }),

  get: (id: string) =>
    apiClient.get<{ data: QuestionRead }>(`/questions/${id}`),
};
