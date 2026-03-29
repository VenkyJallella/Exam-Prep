import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import apiClient from '../../lib/api/client';

interface Stats {
  revenue: { total: number; monthly: number; active_pro: number; active_premium: number };
  users: { total: number; new_week: number; new_month: number; dau: number; wau: number; mau: number };
  content: { questions: number; ai_generated: number; pending_review: number; blogs: number; coding_problems: number };
  activity: { sessions_today: number };
  user_growth: { date: string; count: number }[];
  top_exams: { name: string; sessions: number }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/admin/stats/detailed')
      .then(r => setStats(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />)}</div>
      <div className="grid gap-4 sm:grid-cols-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />)}</div>
    </div>
  );

  if (!stats) return <div className="text-center text-gray-500 py-16">Failed to load dashboard</div>;

  const maxGrowth = Math.max(...stats.user_growth.map(d => d.count), 1);
  const maxExamSessions = stats.top_exams[0]?.sessions || 1;

  return (
    <>
      <Helmet><title>Admin Dashboard - ExamPrep</title></Helmet>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white">
            <p className="text-sm opacity-80">Total Users</p>
            <p className="mt-1 text-3xl font-bold">{stats.users.total.toLocaleString()}</p>
            <p className="mt-1 text-xs opacity-70">+{stats.users.new_week} this week</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 p-5 text-white">
            <p className="text-sm opacity-80">Total Questions</p>
            <p className="mt-1 text-3xl font-bold">{stats.content.questions.toLocaleString()}</p>
            <p className="mt-1 text-xs opacity-70">{stats.content.ai_generated} AI generated</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-5 text-white">
            <p className="text-sm opacity-80">Monthly Revenue</p>
            <p className="mt-1 text-3xl font-bold">₹{stats.revenue.monthly.toLocaleString()}</p>
            <p className="mt-1 text-xs opacity-70">₹{stats.revenue.total.toLocaleString()} total</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-orange-500 to-red-500 p-5 text-white">
            <p className="text-sm opacity-80">Sessions Today</p>
            <p className="mt-1 text-3xl font-bold">{stats.activity.sessions_today}</p>
            <p className="mt-1 text-xs opacity-70">{stats.users.dau} active users</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card text-center"><p className="text-2xl font-bold text-primary-600">{stats.revenue.active_pro}</p><p className="text-sm text-gray-500">Pro Subscribers</p></div>
          <div className="card text-center"><p className="text-2xl font-bold text-purple-600">{stats.revenue.active_premium}</p><p className="text-sm text-gray-500">Premium Subscribers</p></div>
          <div className="card text-center"><p className="text-2xl font-bold text-red-600">{stats.content.pending_review}</p><p className="text-sm text-gray-500">Pending Review</p></div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card"><p className="text-xs text-gray-500 uppercase">Daily Active</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.users.dau}</p></div>
          <div className="card"><p className="text-xs text-gray-500 uppercase">Weekly Active</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.users.wau}</p></div>
          <div className="card"><p className="text-xs text-gray-500 uppercase">Monthly Active</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.users.mau}</p></div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">User Growth (30 days)</h2>
            {stats.user_growth.length === 0 ? <p className="text-sm text-gray-500">No data</p> : (
              <div className="flex h-40 items-end gap-1">
                {stats.user_growth.map(d => (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[9px] text-gray-400">{d.count || ''}</span>
                    <div className="w-full rounded-t bg-primary-500 transition-all" style={{ height: `${Math.max(4, (d.count / maxGrowth) * 100)}%` }} title={`${d.date}: ${d.count}`} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Top Exams (30 days)</h2>
            {stats.top_exams.length === 0 ? <p className="text-sm text-gray-500">No data</p> : (
              <div className="space-y-3">
                {stats.top_exams.map(e => (
                  <div key={e.name}>
                    <div className="flex justify-between text-sm"><span className="font-medium text-gray-700 dark:text-gray-300">{e.name}</span><span className="text-gray-500">{e.sessions}</span></div>
                    <div className="mt-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-full rounded-full bg-primary-500" style={{ width: `${(e.sessions / maxExamSessions) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Content Overview</h2>
          <div className="grid gap-4 sm:grid-cols-5">
            <div className="text-center"><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.content.questions}</p><p className="text-xs text-gray-500">Questions</p></div>
            <div className="text-center"><p className="text-xl font-bold text-blue-600">{stats.content.ai_generated}</p><p className="text-xs text-gray-500">AI Generated</p></div>
            <div className="text-center"><p className="text-xl font-bold text-red-600">{stats.content.pending_review}</p><p className="text-xs text-gray-500">Pending Review</p></div>
            <div className="text-center"><p className="text-xl font-bold text-green-600">{stats.content.blogs}</p><p className="text-xs text-gray-500">Blogs</p></div>
            <div className="text-center"><p className="text-xl font-bold text-purple-600">{stats.content.coding_problems}</p><p className="text-xs text-gray-500">Coding</p></div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { to: '/admin/questions', label: 'Manage Questions', color: 'bg-blue-600' },
            { to: '/admin/pool', label: 'Question Pool', color: 'bg-green-600' },
            { to: '/admin/users', label: 'Manage Users', color: 'bg-orange-600' },
            { to: '/admin/blogs', label: 'Manage Blogs', color: 'bg-purple-600' },
          ].map(a => (
            <Link key={a.to} to={a.to} className={`${a.color} rounded-xl p-4 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90`}>{a.label}</Link>
          ))}
        </div>
      </div>
    </>
  );
}
