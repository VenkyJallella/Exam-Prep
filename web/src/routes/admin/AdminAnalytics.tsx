import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import apiClient from '../../lib/api/client';

export default function AdminAnalytics() {
  const [stats, setStats] = useState<any>(null);
  const [pool, setPool] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      apiClient.get('/admin/stats/detailed').then(r => setStats(r.data.data)),
      apiClient.get('/admin/pool/status').then(r => setPool(r.data.data.pool || [])),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" /></div>;

  // Difficulty distribution from pool
  const diffDist: Record<number, number> = {};
  pool.forEach(p => { diffDist[p.difficulty] = (diffDist[p.difficulty] || 0) + p.count; });
  const maxDiff = Math.max(...Object.values(diffDist), 1);
  const totalQuestions = Object.values(diffDist).reduce((a, b) => a + b, 0);

  const topExams = stats?.top_exams || [];
  const maxExam = topExams[0]?.sessions || 1;
  const userGrowth = stats?.user_growth || [];
  const maxGrowth = Math.max(...userGrowth.map((d: any) => d.count), 1);

  const diffColors = ['bg-green-500', 'bg-lime-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500'];
  const diffLabels = ['Easy', 'Medium-Easy', 'Medium', 'Medium-Hard', 'Hard'];

  return (
    <>
      <Helmet><title>Admin Analytics - ExamPrep</title></Helmet>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>

        {/* Question source breakdown */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="card text-center">
            <p className="text-3xl font-bold text-blue-600">{stats?.content?.questions || 0}</p>
            <p className="text-sm text-gray-500">Total Questions</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-green-600">{stats?.content?.ai_generated || 0}</p>
            <p className="text-sm text-gray-500">AI Generated</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-purple-600">{(stats?.content?.questions || 0) - (stats?.content?.ai_generated || 0)}</p>
            <p className="text-sm text-gray-500">Manual / Imported</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-red-600">{stats?.content?.pending_review || 0}</p>
            <p className="text-sm text-gray-500">Pending Review</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Difficulty distribution - bar chart */}
          <div className="card">
            <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Difficulty Distribution</h2>
            <p className="mb-4 text-xs text-gray-400">{totalQuestions} questions across 5 levels</p>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(d => {
                const count = diffDist[d] || 0;
                const pct = totalQuestions > 0 ? Math.round((count / totalQuestions) * 100) : 0;
                return (
                  <div key={d} className="flex items-center gap-3">
                    <span className="w-24 text-xs font-medium text-gray-600 dark:text-gray-400">{diffLabels[d - 1]}</span>
                    <div className="flex-1 h-6 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div className={`h-full rounded-full ${diffColors[d - 1]} transition-all`} style={{ width: `${Math.max(2, (count / maxDiff) * 100)}%` }} />
                    </div>
                    <span className="w-16 text-right text-xs font-bold text-gray-700 dark:text-gray-300">{count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Exam popularity */}
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Exam Popularity (30 days)</h2>
            {topExams.length === 0 ? <p className="text-sm text-gray-500">No session data yet</p> : (
              <div className="space-y-3">
                {topExams.map((e: any, i: number) => (
                  <div key={e.name}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''} {e.name}
                      </span>
                      <span className="text-gray-500">{e.sessions} sessions</span>
                    </div>
                    <div className="mt-1 h-3 rounded-full bg-gray-100 dark:bg-gray-800">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600" style={{ width: `${(e.sessions / maxExam) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User engagement */}
        {stats && (
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">User Engagement</h2>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-blue-50 p-4 text-center dark:bg-blue-900/20">
                <p className="text-2xl font-bold text-blue-600">{stats.users.dau}</p>
                <p className="text-xs text-gray-500">Daily Active</p>
              </div>
              <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-900/20">
                <p className="text-2xl font-bold text-green-600">{stats.users.wau}</p>
                <p className="text-xs text-gray-500">Weekly Active</p>
              </div>
              <div className="rounded-lg bg-purple-50 p-4 text-center dark:bg-purple-900/20">
                <p className="text-2xl font-bold text-purple-600">{stats.users.mau}</p>
                <p className="text-xs text-gray-500">Monthly Active</p>
              </div>
              <div className="rounded-lg bg-orange-50 p-4 text-center dark:bg-orange-900/20">
                <p className="text-2xl font-bold text-orange-600">{stats.users.new_month}</p>
                <p className="text-xs text-gray-500">New (30d)</p>
              </div>
            </div>
          </div>
        )}

        {/* Practice Stats */}
        {stats?.stats && (
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Practice Performance</h2>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-gray-200 p-4 text-center dark:border-gray-800">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.stats.total_sessions}</p>
                <p className="text-xs text-gray-500">Total Sessions</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4 text-center dark:border-gray-800">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.stats.total_answers}</p>
                <p className="text-xs text-gray-500">Questions Answered</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4 text-center dark:border-gray-800">
                <p className="text-2xl font-bold text-green-600">{stats.stats.correct_answers}</p>
                <p className="text-xs text-gray-500">Correct Answers</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4 text-center dark:border-gray-800">
                <p className={`text-2xl font-bold ${stats.stats.accuracy >= 60 ? 'text-green-600' : stats.stats.accuracy >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {stats.stats.accuracy}%
                </p>
                <p className="text-xs text-gray-500">Overall Accuracy</p>
              </div>
            </div>
          </div>
        )}

        {/* User growth trend */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">User Growth Trend (30 days)</h2>
          {userGrowth.length === 0 ? <p className="text-sm text-gray-500">No data yet</p> : (
            <div className="flex h-48 items-end gap-1">
              {userGrowth.map((d: any) => (
                <div key={d.date} className="group relative flex flex-1 flex-col items-center gap-1">
                  {d.count > 0 && <span className="text-[8px] font-bold text-gray-500">{d.count}</span>}
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-green-500 to-emerald-400 transition-all hover:from-green-400 hover:to-emerald-300"
                    style={{ height: `${Math.max(4, (d.count / maxGrowth) * 100)}%` }}
                    title={`${d.date}: ${d.count} new users`}
                  />
                  <div className="absolute -bottom-5 hidden text-[7px] text-gray-400 group-hover:block">{d.date?.slice(5)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pool health summary */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Question Pool Health</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-900/20">
              <p className="text-2xl font-bold text-green-600">{pool.filter(p => p.count >= 10).length}</p>
              <p className="text-xs text-gray-500">Healthy Pools (10+)</p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-4 text-center dark:bg-yellow-900/20">
              <p className="text-2xl font-bold text-yellow-600">{pool.filter(p => p.count > 0 && p.count < 10).length}</p>
              <p className="text-xs text-gray-500">Low Pools (1-9)</p>
            </div>
            <div className="rounded-lg bg-red-50 p-4 text-center dark:bg-red-900/20">
              <p className="text-2xl font-bold text-red-600">{pool.filter(p => p.count === 0).length}</p>
              <p className="text-xs text-gray-500">Empty Pools</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
