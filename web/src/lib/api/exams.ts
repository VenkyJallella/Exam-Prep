import apiClient from './client';

export interface Exam {
  id: string;
  name: string;
  slug: string;
  full_name: string | null;
  description: string | null;
  icon_url: string | null;
  order: number;
}

export interface Subject {
  id: string;
  exam_id: string;
  name: string;
  slug: string;
  order: number;
}

export interface Topic {
  id: string;
  subject_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  order: number;
  children: Topic[];
}

export const examsAPI = {
  list: () => apiClient.get<{ data: Exam[] }>('/exams'),

  getBySlug: (slug: string) =>
    apiClient.get<{ data: { id: string; name: string; slug: string; subjects: Subject[] } }>(
      `/exams/${slug}`
    ),

  getSubjects: (slug: string) =>
    apiClient.get<{ data: Subject[] }>(`/exams/${slug}/subjects`),

  getTopics: (slug: string, subjectId: string) =>
    apiClient.get<{ data: Topic[] }>(`/exams/${slug}/subjects/${subjectId}/topics`),
};
