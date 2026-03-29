import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/lib/store/authStore';
import { analyticsAPI, leaderboardAPI, OverviewStats, ProgressPoint, TopicPerformance } from '@/lib/api/analytics';

const quickActions = [
  { label: 'Practice Questions', to: '/practice', color: 'bg-blue-500', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { label: 'Mock Test', to: '/tests', color: 'bg-green-500', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { label: 'Mistake Book', to: '/mistakes', color: 'bg-orange-500', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { label: 'Leaderboard', to: '/leaderboard', color: 'bg-purple-500', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
];

const DAILY_GOAL = 20;

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [gamification, setGamification] = useState<{ total_xp: number; level: number; current_streak: number; longest_streak: number; badges: string[] } | null>(null);
  const [progress, setProgress] = useState<ProgressPoint[]>([]);
  const [topTopics, setTopTopics] = useState<TopicPerformance[]>([]);
  const [heatmap, setHeatmap] = useState<Array<{ date: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const results = await Promise.allSettled([
        analyticsAPI.overview(),
        leaderboardAPI.myStats(),
        analyticsAPI.progress(7),
        analyticsAPI.topicPerformance(),
        analyticsAPI.activityHeatmap(30),
      ]);

      if (results[0].status === 'fulfilled') setStats(results[0].value.data.data);
      if (results[1].status === 'fulfilled') setGamification(results[1].value.data.data);
      if (results[2].status === 'fulfilled') setProgress(results[2].value.data.data);
      if (results[3].status === 'fulfilled') setTopTopics(results[3].value.data.data);
      if (results[4].status === 'fulfilled') setHeatmap(results[4].value.data.data);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const todayCount = heatmap.find((h) => h.date === new Date().toISOString().split('T')[0])?.count || 0;
  const goalProgress = Math.min(100, Math.round((todayCount / DAILY_GOAL) * 100));

  const streak = gamification?.current_streak ?? stats?.current_streak ?? 0;
  const totalXp = gamification?.total_xp ?? stats?.total_xp ?? 0;
  const level = gamification?.level ?? stats?.level ?? 1;
  const accuracy = stats?.accuracy_pct ?? 0;
  const questionsAttempted = stats?.total_questions_attempted ?? 0;
  const totalCorrect = stats?.total_correct ?? 0;
  const testsTaken = stats?.total_tests_taken ?? 0;

  // Last 7 days trend
  const last7 = progress.slice(-7);
  const maxQ = Math.max(...last7.map((p) => p.questions), 1);

  return (
    <>
      <Helmet>
        <title>Dashboard - ExamPrep</title>
        <meta name="description" content="Your personalized exam preparation dashboard. Track progress, practice questions, and improve your scores." />
      </Helmet>

      <div className="space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}!
          </h1>
          <p className="mt-1 text-sm text-gray-500">Here's your preparation overview</p>
        </div>

        {/* Stats row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card">
            <p className="text-sm font-medium text-gray-500">Questions Practiced</p>
            {loading ? (
              <div className="mt-2 h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            ) : (
              <>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{questionsAttempted.toLocaleString()}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {totalCorrect} correct ({questionsAttempted > 0 ? `${accuracy.toFixed(1)}%` : 'No data yet'})
                </p>
              </>
            )}
          </div>

          <div className="card">
            <p className="text-sm font-medium text-gray-500">Accuracy</p>
            {loading ? (
              <div className="mt-2 h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            ) : (
              <>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{accuracy.toFixed(1)}%</p>
                <p className="mt-1 text-xs text-gray-400">
                  {accuracy >= 80 ? 'Excellent!' : accuracy >= 60 ? 'Good progress' : accuracy > 0 ? 'Keep practicing' : 'Start practicing!'}
                </p>
              </>
            )}
          </div>

          <div className="card">
            <p className="text-sm font-medium text-gray-500">Current Streak</p>
            {loading ? (
              <div className="mt-2 h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            ) : (
              <>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{streak} day{streak !== 1 ? 's' : ''}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {gamification?.longest_streak ? `Best: ${gamification.longest_streak} days` : streak > 0 ? 'Keep it up!' : 'Start a streak!'}
                </p>
              </>
            )}
          </div>

          <div className="card">
            <p className="text-sm font-medium text-gray-500">Total XP</p>
            {loading ? (
              <div className="mt-2 h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            ) : (
              <>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{totalXp.toLocaleString()}</p>
                <p className="mt-1 text-xs text-gray-400">Level {level}</p>
              </>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="card group flex items-center gap-4 transition-shadow hover:shadow-md"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${action.color} text-white`}>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
                  </svg>
                </div>
                <span className="font-medium text-gray-900 group-hover:text-primary-600 dark:text-white">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Daily Goal */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Daily Goal</h2>
            <div className="mt-4 flex items-center gap-6">
              <div className="relative h-24 w-24 shrink-0">
                <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" className="dark:stroke-gray-700" />
                  <circle
                    cx="50" cy="50" r="45" fill="none"
                    stroke={goalProgress >= 100 ? '#22c55e' : '#3b82f6'}
                    strokeWidth="8"
                    strokeDasharray={`${goalProgress * 2.83} ${283}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{todayCount}/{DAILY_GOAL}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {goalProgress >= 100
                    ? 'Goal reached! Great work today!'
                    : `Practice ${DAILY_GOAL - todayCount} more question${DAILY_GOAL - todayCount !== 1 ? 's' : ''} to hit your daily goal`}
                </p>
                {goalProgress < 100 && (
                  <Link to="/practice" className="btn-primary mt-3 inline-block text-sm">
                    Start Practicing
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* 7-Day Activity */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">7-Day Activity</h2>
            {loading ? (
              <div className="mt-4 flex h-32 items-end gap-2">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="flex-1 animate-pulse rounded-t bg-gray-200 dark:bg-gray-700" style={{ height: `${30 + Math.random() * 70}%` }} />
                ))}
              </div>
            ) : last7.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">No activity data yet. Start practicing!</p>
            ) : (
              <div className="mt-4 flex h-32 items-end gap-2">
                {last7.map((day) => {
                  const height = Math.max(8, (day.questions / maxQ) * 100);
                  return (
                    <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] font-medium text-gray-500">{day.questions}</span>
                      <div
                        className="w-full rounded-t bg-primary-500 transition-all dark:bg-primary-400"
                        style={{ height: `${height}%` }}
                        title={`${day.date}: ${day.questions} questions, ${day.accuracy.toFixed(0)}% accuracy`}
                      />
                      <span className="text-[10px] text-gray-400">
                        {new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Top Topics & Tests */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Topic Performance */}
          <div className="card">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Topic Performance</h2>
              <Link to="/analytics" className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400">
                View All
              </Link>
            </div>
            {loading ? (
              <div className="mt-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                ))}
              </div>
            ) : topTopics.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">No topic data yet. Practice to see your strengths.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {topTopics.slice(0, 5).map((topic) => (
                  <div key={topic.topic_id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[60%]">{topic.topic_name}</span>
                      <span className="text-gray-500">{topic.accuracy_pct.toFixed(0)}% ({topic.questions_attempted} Q)</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className={`h-full rounded-full ${
                          topic.accuracy_pct >= 80 ? 'bg-green-500' : topic.accuracy_pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${topic.accuracy_pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Summary</h2>
            {loading ? (
              <div className="mt-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                ))}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5 dark:bg-gray-800">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Tests Completed</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{testsTaken}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5 dark:bg-gray-800">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Questions Correct</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">{totalCorrect.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5 dark:bg-gray-800">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Questions Wrong</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">{(questionsAttempted - totalCorrect).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5 dark:bg-gray-800">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Rank</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{stats?.rank ? `#${stats.rank}` : 'Unranked'}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5 dark:bg-gray-800">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Longest Streak</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{gamification?.longest_streak ?? 0} days</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 30-Day Activity Heatmap */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">30-Day Activity</h2>
          {loading ? (
            <div className="mt-4 flex gap-1 flex-wrap">
              {[...Array(30)].map((_, i) => (
                <div key={i} className="h-5 w-5 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              ))}
            </div>
          ) : (
            <div className="mt-4 flex gap-1 flex-wrap">
              {(() => {
                // Build 30-day grid
                const days: Array<{ date: string; count: number }> = [];
                const heatmapMap = new Map(heatmap.map((h) => [h.date, h.count]));
                for (let i = 29; i >= 0; i--) {
                  const d = new Date();
                  d.setDate(d.getDate() - i);
                  const dateStr = d.toISOString().split('T')[0];
                  days.push({ date: dateStr, count: heatmapMap.get(dateStr) || 0 });
                }
                const maxCount = Math.max(...days.map((d) => d.count), 1);
                return days.map((day) => {
                  const intensity = day.count / maxCount;
                  let bg = 'bg-gray-100 dark:bg-gray-800';
                  if (day.count > 0) {
                    if (intensity >= 0.75) bg = 'bg-green-600 dark:bg-green-500';
                    else if (intensity >= 0.5) bg = 'bg-green-400 dark:bg-green-600';
                    else if (intensity >= 0.25) bg = 'bg-green-300 dark:bg-green-700';
                    else bg = 'bg-green-200 dark:bg-green-800';
                  }
                  return (
                    <div
                      key={day.date}
                      className={`h-5 w-5 rounded ${bg}`}
                      title={`${day.date}: ${day.count} questions`}
                    />
                  );
                });
              })()}
            </div>
          )}
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
            <span>Less</span>
            <div className="h-3 w-3 rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-3 w-3 rounded bg-green-200 dark:bg-green-800" />
            <div className="h-3 w-3 rounded bg-green-400 dark:bg-green-600" />
            <div className="h-3 w-3 rounded bg-green-600 dark:bg-green-500" />
            <span>More</span>
          </div>
        </div>
      </div>
    </>
  );
}
