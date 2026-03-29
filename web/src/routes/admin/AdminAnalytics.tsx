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

  const topExams = stats?.top_exams || [];
  const maxExam = topExams[0]?.sessions || 1;
  const userGrowth = stats?.user_growth || [];
  const maxGrowth = Math.max(...userGrowth.map((d: any) => d.count), 1);

  return (
    <>
      <Helmet><title>Admin Analytics - ExamPrep</title></Helmet>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>

        {/* Question source breakdown */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card text-center">
            <p className="text-3xl font-bold text-blue-600">{stats?.content?.ai_generated || 0}</p>
            <p className="text-sm text-gray-500">AI Generated</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-green-600">{(stats?.content?.questions || 0) - (stats?.content?.ai_generated || 0)}</p>
            <p className="text-sm text-gray-500">Manual / Imported</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-red-600">{stats?.content?.pending_review || 0}</p>
            <p className="text-sm text-gray-500">Pending Review</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Difficulty distribution */}
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Difficulty Distribution</h2>
            <div className="flex h-48 items-end gap-4 px-4">
              {[1, 2, 3, 4, 5].map(d => {
                const count = diffDist[d] || 0;
                const height = Math.max(8, (count / maxDiff) * 100);
                const colors = ['bg-green-500', 'bg-lime-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500'];
                return (
                  <div key={d} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-xs font-bold text-gray-500">{count}</span>
                    <div className={`w-full rounded-t ${colors[d - 1]}`} style={{ height: `${height}%` }} />
                    <span className="text-xs text-gray-400">L{d}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Exam popularity */}
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Exam Popularity (30 days)</h2>
            {topExams.length === 0 ? <p className="text-sm text-gray-500">No data</p> : (
              <div className="space-y-3">
                {topExams.map((e: any) => (
                  <div key={e.name}>
                    <div className="flex justify-between text-sm"><span className="font-medium text-gray-700 dark:text-gray-300">{e.name}</span><span className="text-gray-500">{e.sessions} sessions</span></div>
                    <div className="mt-1 h-3 rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600" style={{ width: `${(e.sessions / maxExam) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User growth trend */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">User Growth Trend (30 days)</h2>
          {userGrowth.length === 0 ? <p className="text-sm text-gray-500">No data</p> : (
            <div className="flex h-48 items-end gap-1">
              {userGrowth.map((d: any) => (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[8px] text-gray-400">{d.count || ''}</span>
                  <div className="w-full rounded-t bg-gradient-to-t from-green-500 to-emerald-400" style={{ height: `${Math.max(4, (d.count / maxGrowth) * 100)}%` }} title={`${d.date}: ${d.count} new users`} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User engagement */}
        {stats && (
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">User Engagement</h2>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-blue-50 p-4 text-center dark:bg-blue-900/20"><p className="text-2xl font-bold text-blue-600">{stats.users.dau}</p><p className="text-xs text-gray-500">DAU</p></div>
              <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-900/20"><p className="text-2xl font-bold text-green-600">{stats.users.wau}</p><p className="text-xs text-gray-500">WAU</p></div>
              <div className="rounded-lg bg-purple-50 p-4 text-center dark:bg-purple-900/20"><p className="text-2xl font-bold text-purple-600">{stats.users.mau}</p><p className="text-xs text-gray-500">MAU</p></div>
              <div className="rounded-lg bg-orange-50 p-4 text-center dark:bg-orange-900/20"><p className="text-2xl font-bold text-orange-600">{stats.users.new_month}</p><p className="text-xs text-gray-500">New (30d)</p></div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
