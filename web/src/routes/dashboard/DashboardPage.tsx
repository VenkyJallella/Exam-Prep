import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/lib/store/authStore';

const quickActions = [
  { label: 'Practice Questions', to: '/practice', color: 'bg-blue-500', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { label: 'Mock Test', to: '/tests', color: 'bg-green-500', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { label: 'Mistake Book', to: '/mistakes', color: 'bg-orange-500', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { label: 'Leaderboard', to: '/leaderboard', color: 'bg-purple-500', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

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
          {[
            { label: 'Questions Practiced', value: '0', change: 'Start practicing!' },
            { label: 'Accuracy', value: '0%', change: 'No data yet' },
            { label: 'Current Streak', value: '0 days', change: 'Start a streak!' },
            { label: 'Total XP', value: '0', change: 'Level 1' },
          ].map((stat) => (
            <div key={stat.label} className="card">
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="mt-1 text-xs text-gray-400">{stat.change}</p>
            </div>
          ))}
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

        {/* Daily Goal */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Daily Goal</h2>
          <div className="mt-4 flex items-center gap-6">
            <div className="relative h-24 w-24">
              <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="#3b82f6" strokeWidth="8"
                  strokeDasharray={`${0 * 2.83} ${283}`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-gray-900 dark:text-white">0/20</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Practice 20 questions today to maintain your streak
              </p>
              <Link to="/practice" className="btn-primary mt-3 text-sm">
                Start Practicing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
