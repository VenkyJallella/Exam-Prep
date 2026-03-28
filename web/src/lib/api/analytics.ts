import apiClient from './client';

export interface OverviewStats {
  total_questions_attempted: number;
  total_correct: number;
  accuracy_pct: number;
  total_tests_taken: number;
  current_streak: number;
  total_xp: number;
  level: number;
  rank: number | null;
}

export interface TopicPerformance {
  topic_id: string;
  topic_name: string;
  mastery_level: number;
  questions_attempted: number;
  questions_correct: number;
  accuracy_pct: number;
  avg_time_seconds: number;
}

export interface ProgressPoint {
  date: string;
  accuracy: number;
  questions: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  total_xp: number;
  level: number;
  current_streak: number;
}

export const analyticsAPI = {
  overview: () =>
    apiClient.get<{ data: OverviewStats }>('/users/me/stats'),

  topicPerformance: () =>
    apiClient.get<{ data: TopicPerformance[] }>('/analytics/topics'),

  progress: (days?: number) =>
    apiClient.get<{ data: ProgressPoint[] }>('/analytics/progress', {
      params: { days: days || 30 },
    }),

  activityHeatmap: (days?: number) =>
    apiClient.get<{ data: Array<{ date: string; count: number }> }>('/analytics/activity-heatmap', {
      params: { days: days || 90 },
    }),
};

export const leaderboardAPI = {
  global: (page?: number) =>
    apiClient.get<{ data: LeaderboardEntry[]; meta: any }>('/gamification/leaderboard', {
      params: { page: page || 1 },
    }),

  weekly: () =>
    apiClient.get<{ data: LeaderboardEntry[] }>('/gamification/leaderboard/weekly'),

  myStats: () =>
    apiClient.get<{ data: { total_xp: number; level: number; current_streak: number; longest_streak: number; badges: string[] } }>(
      '/gamification/me'
    ),
};
