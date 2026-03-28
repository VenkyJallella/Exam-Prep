import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { leaderboardAPI, type LeaderboardEntry } from '@/lib/api/analytics';
import toast from 'react-hot-toast';

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [weeklyEntries, setWeeklyEntries] = useState<LeaderboardEntry[]>([]);
  const [myStats, setMyStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'global' | 'weekly'>('global');
  const [page, setPage] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);

  useEffect(() => {
    Promise.all([
      leaderboardAPI.global(page).then((r) => {
        setEntries(r.data.data);
        setTotalEntries(r.data.meta?.total || 0);
      }),
      leaderboardAPI.weekly().then((r) => setWeeklyEntries(r.data.data)),
      leaderboardAPI.myStats().then((r) => setMyStats(r.data.data)),
    ])
      .catch(() => toast.error('Failed to load leaderboard'))
      .finally(() => setLoading(false));
  }, [page]);

  const currentEntries = tab === 'global' ? entries : weeklyEntries;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Leaderboard - ExamPrep</title></Helmet>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leaderboard</h1>

        {/* My stats card */}
        {myStats && (
          <div className="card flex items-center justify-between bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20">
            <div>
              <p className="text-sm text-gray-500">Your Stats</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                Level {myStats.level} · {myStats.total_xp} XP
              </p>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-primary-600">{myStats.current_streak}</p>
                <p className="text-xs text-gray-500">Day Streak</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{myStats.longest_streak}</p>
                <p className="text-xs text-gray-500">Best Streak</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          <button
            onClick={() => setTab('global')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              tab === 'global'
                ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setTab('weekly')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              tab === 'weekly'
                ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            This Week
          </button>
        </div>

        {/* Leaderboard table */}
        <div className="card overflow-hidden p-0">
          {currentEntries.length === 0 ? (
            <div className="py-12 text-center text-gray-400">No leaderboard data yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                    <th className="px-4 py-3 font-medium text-gray-500">Rank</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Name</th>
                    <th className="px-4 py-3 font-medium text-gray-500">XP</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Level</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Streak</th>
                  </tr>
                </thead>
                <tbody>
                  {currentEntries.map((entry) => (
                    <tr key={entry.user_id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="px-4 py-3">
                        {entry.rank <= 3 ? (
                          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${
                            entry.rank === 1 ? 'bg-yellow-500' : entry.rank === 2 ? 'bg-gray-400' : 'bg-orange-400'
                          }`}>
                            {entry.rank}
                          </span>
                        ) : (
                          <span className="pl-2 text-gray-500">{entry.rank}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {entry.display_name}
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary-600">{entry.total_xp}</td>
                      <td className="px-4 py-3 text-gray-500">{entry.level}</td>
                      <td className="px-4 py-3">
                        {entry.current_streak > 0 && (
                          <span className="text-orange-500">{entry.current_streak} days</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination for global */}
        {tab === 'global' && totalEntries > 20 && (
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <span className="flex items-center px-3 text-sm text-gray-500">
              Page {page} of {Math.ceil(totalEntries / 20)}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(totalEntries / 20)}
              className="btn-secondary text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
}
