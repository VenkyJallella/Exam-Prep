import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  analyticsAPI,
  type OverviewStats,
  type TopicPerformance,
  type ProgressPoint,
} from '@/lib/api/analytics';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import toast from 'react-hot-toast';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [topics, setTopics] = useState<TopicPerformance[]>([]);
  const [progress, setProgress] = useState<ProgressPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      analyticsAPI.overview().then((r) => setStats(r.data.data)),
      analyticsAPI.topicPerformance().then((r) => setTopics(r.data.data)),
      analyticsAPI.progress(days).then((r) => setProgress(r.data.data)),
    ])
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Analytics - ExamPrep</title></Helmet>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Performance Analytics</h1>

        {/* Stats cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card text-center">
            <p className="text-3xl font-bold text-primary-600">{stats?.accuracy_pct ?? 0}%</p>
            <p className="mt-1 text-sm text-gray-500">Overall Accuracy</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.total_questions_attempted ?? 0}</p>
            <p className="mt-1 text-sm text-gray-500">Questions Attempted</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-green-600">{stats?.total_correct ?? 0}</p>
            <p className="mt-1 text-sm text-gray-500">Correct Answers</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-purple-600">{stats?.total_xp ?? 0}</p>
            <p className="mt-1 text-sm text-gray-500">Total XP (Level {stats?.level ?? 1})</p>
          </div>
        </div>

        {/* Progress chart */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Progress Over Time</h2>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-lg border border-gray-200 px-3 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
          {progress.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={progress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value: number, name: string) => [
                    name === 'accuracy' ? `${value}%` : value,
                    name === 'accuracy' ? 'Accuracy' : 'Questions',
                  ]}
                />
                <Line type="monotone" dataKey="accuracy" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-gray-400">
              Start practicing to see your progress chart
            </div>
          )}
        </div>

        {/* Topic performance */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Topic Performance</h2>
          {topics.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={Math.max(200, topics.length * 45)}>
                <BarChart data={topics} layout="vertical" margin={{ left: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                  <YAxis
                    dataKey="topic_name"
                    type="category"
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(v: number) => [`${v}%`, 'Accuracy']}
                  />
                  <Bar dataKey="accuracy_pct" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>

              {/* Topic table */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="px-3 py-2 font-medium text-gray-500">Topic</th>
                      <th className="px-3 py-2 font-medium text-gray-500">Attempted</th>
                      <th className="px-3 py-2 font-medium text-gray-500">Correct</th>
                      <th className="px-3 py-2 font-medium text-gray-500">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topics.map((t) => (
                      <tr key={t.topic_id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{t.topic_name}</td>
                        <td className="px-3 py-2 text-gray-500">{t.questions_attempted}</td>
                        <td className="px-3 py-2 text-green-600">{t.questions_correct}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            t.accuracy_pct >= 70
                              ? 'bg-green-100 text-green-700'
                              : t.accuracy_pct >= 40
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                          }`}>
                            {t.accuracy_pct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex h-48 items-center justify-center text-gray-400">
              No topic data yet
            </div>
          )}
        </div>
      </div>
    </>
  );
}
