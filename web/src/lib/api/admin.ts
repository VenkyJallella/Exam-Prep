import apiClient from './client';

export const adminAPI = {
  // Dashboard stats
  dashboardStats: () =>
    apiClient.get<{ data: { total_users: number; total_questions: number; total_tests: number; today_active: number; pending_review: number } }>(
      '/admin/dashboard'
    ),

  // Questions
  listQuestions: (params?: Record<string, any>) =>
    apiClient.get('/admin/questions', { params }),

  createQuestion: (data: any) =>
    apiClient.post('/questions', data),

  updateQuestion: (id: string, data: any) =>
    apiClient.patch(`/questions/${id}`, data),

  deleteQuestion: (id: string) =>
    apiClient.patch(`/questions/${id}`, { is_active: false }),

  generateQuestions: (data: {
    exam_id: string;
    topic_id: string;
    count: number;
    difficulty: number;
  }) => apiClient.post('/questions/generate', data),

  // Tests
  listTests: (params?: Record<string, any>) =>
    apiClient.get('/admin/tests', { params }),

  createTest: (data: any) =>
    apiClient.post('/admin/tests', data),

  // Users
  listUsers: (params?: Record<string, any>) =>
    apiClient.get('/admin/users', { params }),

  suspendUser: (id: string) =>
    apiClient.patch(`/admin/users/${id}`, { is_active: false }),

  activateUser: (id: string) =>
    apiClient.patch(`/admin/users/${id}`, { is_active: true }),
};
