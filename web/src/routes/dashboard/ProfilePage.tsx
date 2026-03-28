import { Helmet } from 'react-helmet-async';
import { useAuthStore } from '@/lib/store/authStore';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);

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
                  0 day streak
                </span>
                <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
                  Level 1
                </span>
                <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600 dark:bg-green-900/20 dark:text-green-400">
                  0 XP
                </span>
              </div>
            </div>
            <button className="btn-secondary ml-auto hidden sm:block">Edit Profile</button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: 'Questions', value: '0' },
            { label: 'Accuracy', value: '0%' },
            { label: 'Tests Taken', value: '0' },
            { label: 'Global Rank', value: '--' },
          ].map((stat) => (
            <div key={stat.label} className="card text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Activity Heatmap Placeholder */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Activity</h2>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: 90 }, (_, i) => (
              <div
                key={i}
                className="h-3 w-3 rounded-sm bg-gray-100 dark:bg-gray-800"
                title="No activity"
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-400">Last 90 days</p>
        </div>

        {/* Topic Mastery */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Topic Mastery</h2>
          <p className="text-sm text-gray-500">Start practicing to see your topic mastery levels.</p>
        </div>

        {/* Badges */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Badges</h2>
          <div className="grid grid-cols-4 gap-4 sm:grid-cols-6">
            {['First Question', 'Week Warrior', '100 Club', 'Speed Demon', 'Perfect Score', 'Streak Master'].map((badge) => (
              <div key={badge} className="flex flex-col items-center gap-2 opacity-30">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-xl dark:bg-gray-800">
                  ?
                </div>
                <span className="text-center text-xs text-gray-500">{badge}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
