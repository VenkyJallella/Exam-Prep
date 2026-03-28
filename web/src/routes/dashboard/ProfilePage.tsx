import { useEffect, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuthStore } from '@/lib/store/authStore';
import { analyticsAPI, leaderboardAPI, OverviewStats, TopicPerformance } from '@/lib/api/analytics';

interface HeatmapDay {
  date: string;
  count: number;
}

interface GamificationStats {
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  badges: string[];
}

const BADGE_ICONS: Record<string, string> = {
  'first_question': 'Q',
  'week_warrior': 'W',
  '100_club': '100',
  'speed_demon': 'S',
  'perfect_score': 'P',
  'streak_master': 'F',
  'topic_master': 'T',
  'daily_grind': 'D',
};

const BADGE_LABELS: Record<string, string> = {
  'first_question': 'First Question',
  'week_warrior': 'Week Warrior',
  '100_club': '100 Club',
  'speed_demon': 'Speed Demon',
  'perfect_score': 'Perfect Score',
  'streak_master': 'Streak Master',
  'topic_master': 'Topic Master',
  'daily_grind': 'Daily Grind',
};

const ALL_BADGES = [
  'first_question',
  'week_warrior',
  '100_club',
  'speed_demon',
  'perfect_score',
  'streak_master',
];

function getHeatmapColor(count: number): string {
  if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
  if (count <= 2) return 'bg-green-200 dark:bg-green-900';
  if (count <= 5) return 'bg-green-400 dark:bg-green-700';
  if (count <= 10) return 'bg-green-500 dark:bg-green-600';
  return 'bg-green-700 dark:bg-green-500';
}

function buildHeatmapGrid(data: HeatmapDay[]): Array<{ date: string; count: number }> {
  const map = new Map(data.map((d) => [d.date, d.count]));
  const days: Array<{ date: string; count: number }> = [];
  const now = new Date();

  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    days.push({ date: dateStr, count: map.get(dateStr) || 0 });
  }

  return days;
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);

  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [topicPerf, setTopicPerf] = useState<TopicPerformance[]>([]);
  const [gamification, setGamification] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [statsRes, heatmapRes, topicsRes, gamRes] = await Promise.allSettled([
          analyticsAPI.overview(),
          analyticsAPI.activityHeatmap(90),
          analyticsAPI.topicPerformance(),
          leaderboardAPI.myStats(),
        ]);

        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data);
        if (heatmapRes.status === 'fulfilled') setHeatmapData(heatmapRes.value.data.data);
        if (topicsRes.status === 'fulfilled') setTopicPerf(topicsRes.value.data.data);
        if (gamRes.status === 'fulfilled') setGamification(gamRes.value.data.data);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const heatmapGrid = useMemo(() => buildHeatmapGrid(heatmapData), [heatmapData]);

  const earnedBadges = gamification?.badges || [];

  return (
    <>
      <Helmet><title>Profile - ExamPrep</title></Helmet>

      <div className="mx-auto max-w-4xl space-y-6">
        {/* Profile Header */}
        <div className="card">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-2xl font-bold text-white">
              {user?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {user?.full_name || 'Student'}
              </h1>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                <span className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
                  {gamification?.current_streak ?? stats?.current_streak ?? 0} day streak
                </span>
                <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
                  Level {gamification?.level ?? stats?.level ?? 1}
                </span>
                <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600 dark:bg-green-900/20 dark:text-green-400">
                  {gamification?.total_xp ?? stats?.total_xp ?? 0} XP
                </span>
              </div>
            </div>
            <button className="btn-secondary ml-auto hidden sm:block">Edit Profile</button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: 'Questions', value: stats?.total_questions_attempted?.toLocaleString() ?? '0' },
            { label: 'Accuracy', value: stats ? `${stats.accuracy_pct}%` : '0%' },
            { label: 'Tests Taken', value: stats?.total_tests_taken?.toLocaleString() ?? '0' },
            { label: 'Global Rank', value: stats?.rank ? `#${stats.rank}` : '--' },
          ].map((stat) => (
            <div key={stat.label} className="card text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Activity Heatmap */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Activity</h2>
          <div className="flex flex-wrap gap-1">
            {heatmapGrid.map((day) => (
              <div
                key={day.date}
                className={`h-3 w-3 rounded-sm ${getHeatmapColor(day.count)}`}
                title={`${day.date}: ${day.count} question${day.count !== 1 ? 's' : ''}`}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <p className="text-xs text-gray-400">Last 90 days</p>
            <div className="ml-auto flex items-center gap-1 text-xs text-gray-400">
              <span>Less</span>
              <div className="h-3 w-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-3 rounded-sm bg-green-200 dark:bg-green-900" />
              <div className="h-3 w-3 rounded-sm bg-green-400 dark:bg-green-700" />
              <div className="h-3 w-3 rounded-sm bg-green-500 dark:bg-green-600" />
              <div className="h-3 w-3 rounded-sm bg-green-700 dark:bg-green-500" />
              <span>More</span>
            </div>
          </div>
        </div>

        {/* Topic Mastery */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Topic Mastery</h2>
          {topicPerf.length === 0 ? (
            <p className="text-sm text-gray-500">Start practicing to see your topic mastery levels.</p>
          ) : (
            <div className="space-y-3">
              {topicPerf.map((topic) => (
                <div key={topic.topic_id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">{topic.topic_name}</span>
                    <span className="text-gray-500">
                      {topic.accuracy_pct}% ({topic.questions_correct}/{topic.questions_attempted})
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-full rounded-full bg-primary-500 transition-all"
                      style={{ width: `${Math.min(topic.mastery_level * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Badges</h2>
          <div className="grid grid-cols-4 gap-4 sm:grid-cols-6">
            {ALL_BADGES.map((badge) => {
              const earned = earnedBadges.includes(badge);
              return (
                <div key={badge} className={`flex flex-col items-center gap-2 ${earned ? '' : 'opacity-30'}`}>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${
                    earned
                      ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
                  }`}>
                    {BADGE_ICONS[badge] || '?'}
                  </div>
                  <span className="text-center text-xs text-gray-500">
                    {BADGE_LABELS[badge] || badge}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
