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

  importCSV: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<{ data: { imported: number; errors: string[] } }>(
      '/questions/import-csv',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },

  // Tests
  listTests: (params?: Record<string, any>) =>
    apiClient.get('/admin/tests', { params }),

  createTest: (data: any) =>
    apiClient.post('/admin/tests', data),

  toggleTestPublish: (testId: string) =>
    apiClient.post(`/admin/tests/${testId}/toggle-publish`),

  deleteTest: (testId: string) =>
    apiClient.delete(`/admin/tests/${testId}`),

  // Users
  listUsers: (params?: Record<string, any>) =>
    apiClient.get('/admin/users', { params }),

  suspendUser: (id: string) =>
    apiClient.patch(`/admin/users/${id}`, { is_active: false }),

  activateUser: (id: string) =>
    apiClient.patch(`/admin/users/${id}`, { is_active: true }),

  // Exams / Taxonomy
  listExams: () =>
    apiClient.get<{ data: any[] }>('/admin/exams'),

  createExam: (data: { name: string; description?: string }) =>
    apiClient.post('/admin/exams', data),

  deleteExam: (examId: string) =>
    apiClient.delete(`/admin/exams/${examId}`),

  createSubject: (data: { exam_id: string; name: string }) =>
    apiClient.post('/admin/subjects', data),

  deleteSubject: (subjectId: string) =>
    apiClient.delete(`/admin/subjects/${subjectId}`),

  createTopic: (data: { subject_id: string; name: string }) =>
    apiClient.post('/admin/topics', data),

  deleteTopic: (topicId: string) =>
    apiClient.delete(`/admin/topics/${topicId}`),

  // Blog
  listBlogs: (params?: Record<string, any>) =>
    apiClient.get('/blog/admin/list', { params }),

  getBlog: (postId: string) =>
    apiClient.get(`/blog/admin/${postId}`),

  createBlog: (data: { title: string; content: string; excerpt: string; meta_description: string; tags?: string[]; status?: string }) =>
    apiClient.post('/blog/admin/create', data),

  generateBlog: (data: { topic: string; explanation: string; exam_name?: string; auto_publish?: boolean }) =>
    apiClient.post('/blog/admin/generate', data),

  updateBlog: (postId: string, data: Record<string, any>) =>
    apiClient.patch(`/blog/admin/${postId}`, data),

  toggleBlogPublish: (postId: string) =>
    apiClient.post(`/blog/admin/${postId}/toggle-publish`),

  deleteBlog: (postId: string) =>
    apiClient.delete(`/blog/admin/${postId}`),
};
