import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { adminAPI } from '@/lib/api/admin';
import toast from 'react-hot-toast';

interface DashboardStats {
  total_users: number;
  total_questions: number;
  total_tests: number;
  today_active: number;
  pending_review: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.dashboardStats()
      .then((r) => setStats(r.data.data))
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  const cards = [
    { label: 'Total Users', value: stats?.total_users ?? 0, color: 'text-blue-600', link: '/admin/users' },
    { label: 'Questions', value: stats?.total_questions ?? 0, color: 'text-green-600', link: '/admin/questions' },
    { label: 'Tests', value: stats?.total_tests ?? 0, color: 'text-purple-600', link: null },
    { label: 'Today Active', value: stats?.today_active ?? 0, color: 'text-orange-600', link: null },
    { label: 'Pending Review', value: stats?.pending_review ?? 0, color: 'text-red-600', link: '/admin/questions?verified=false' },
  ];

  return (
    <>
      <Helmet>
        <title>Admin Dashboard - ExamPrep</title>
        <meta name="description" content="Admin dashboard for ExamPrep. Monitor platform stats, users, questions, and tests." />
      </Helmet>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((stat) => {
            const content = (
              <div className="card hover:shadow-md transition-shadow">
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className={`mt-1 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            );
            return stat.link ? (
              <Link key={stat.label} to={stat.link}>{content}</Link>
            ) : (
              <div key={stat.label}>{content}</div>
            );
          })}
        </div>

        {/* Quick actions */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              to="/admin/questions"
              className="rounded-xl border-2 border-dashed border-gray-200 p-4 text-center transition-all hover:border-primary-400 hover:bg-primary-50 dark:border-gray-700 dark:hover:border-primary-500 dark:hover:bg-primary-900/10"
            >
              <p className="font-medium text-gray-900 dark:text-white">Manage Questions</p>
              <p className="text-xs text-gray-500">Create, edit, AI generate</p>
            </Link>
            <Link
              to="/admin/users"
              className="rounded-xl border-2 border-dashed border-gray-200 p-4 text-center transition-all hover:border-primary-400 hover:bg-primary-50 dark:border-gray-700 dark:hover:border-primary-500 dark:hover:bg-primary-900/10"
            >
              <p className="font-medium text-gray-900 dark:text-white">Manage Users</p>
              <p className="text-xs text-gray-500">View, suspend, activate</p>
            </Link>
            <Link
              to="/admin/questions"
              className="rounded-xl border-2 border-dashed border-gray-200 p-4 text-center transition-all hover:border-primary-400 hover:bg-primary-50 dark:border-gray-700 dark:hover:border-primary-500 dark:hover:bg-primary-900/10"
            >
              <p className="font-medium text-gray-900 dark:text-white">AI Generate</p>
              <p className="text-xs text-gray-500">Generate questions with GPT</p>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
