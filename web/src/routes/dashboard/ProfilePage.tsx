import { useEffect, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/lib/store/authStore';
import { analyticsAPI, leaderboardAPI, OverviewStats, TopicPerformance } from '@/lib/api/analytics';
import apiClient from '@/lib/api/client';
import toast from 'react-hot-toast';

interface HeatmapDay { date: string; count: number; }
interface GamificationStats { total_xp: number; level: number; current_streak: number; longest_streak: number; badges: string[]; }

const BADGE_META: Record<string, { icon: string; label: string; desc: string; color: string }> = {
  first_question: { icon: '🎯', label: 'First Question', desc: 'Answer your first question', color: 'from-blue-400 to-blue-600' },
  week_warrior: { icon: '⚔️', label: 'Week Warrior', desc: '7-day practice streak', color: 'from-orange-400 to-red-500' },
  '100_club': { icon: '💯', label: '100 Club', desc: 'Answer 100 questions correctly', color: 'from-green-400 to-emerald-600' },
  speed_demon: { icon: '⚡', label: 'Speed Demon', desc: 'Complete a session under 2 min', color: 'from-yellow-400 to-orange-500' },
  perfect_score: { icon: '🏆', label: 'Perfect Score', desc: '100% accuracy in a session', color: 'from-purple-400 to-purple-600' },
  streak_master: { icon: '🔥', label: 'Streak Master', desc: '30-day practice streak', color: 'from-red-400 to-red-600' },
};

const ALL_BADGES = Object.keys(BADGE_META);

function getHeatmapColor(count: number): string {
  if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
  if (count <= 2) return 'bg-green-200 dark:bg-green-900';
  if (count <= 5) return 'bg-green-400 dark:bg-green-700';
  if (count <= 10) return 'bg-green-500 dark:bg-green-600';
  return 'bg-green-700 dark:bg-green-500';
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [topicPerf, setTopicPerf] = useState<TopicPerformance[]>([]);
  const [gamification, setGamification] = useState<GamificationStats | null>(null);
  const [usageData, setUsageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'topics' | 'badges' | 'settings'>('overview');
  const [topicPage, setTopicPage] = useState(1);

  // Edit profile
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(user?.full_name || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      analyticsAPI.overview().then(r => setStats(r.data.data)),
      analyticsAPI.activityHeatmap(90).then(r => setHeatmapData(r.data.data)),
      analyticsAPI.topicPerformance().then(r => setTopicPerf(r.data.data)),
      leaderboardAPI.myStats().then(r => setGamification(r.data.data)),
      apiClient.get('/payments/usage').then(r => setUsageData(r.data.data)),
    ]).finally(() => setLoading(false));
  }, []);

  const heatmapGrid = useMemo(() => {
    const map = new Map(heatmapData.map((d) => [d.date, d.count]));
    const days: HeatmapDay[] = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({ date: dateStr, count: map.get(dateStr) || 0 });
    }
    return days;
  }, [heatmapData]);

  const earnedBadges = gamification?.badges || [];
  const totalDaysActive = heatmapGrid.filter(d => d.count > 0).length;
  const totalQuestionsLast90 = heatmapGrid.reduce((s, d) => s + d.count, 0);
  const streak = gamification?.current_streak ?? stats?.current_streak ?? 0;
  const level = gamification?.level ?? stats?.level ?? 1;
  const xp = gamification?.total_xp ?? stats?.total_xp ?? 0;
  const xpToNext = ((level) * 500) - xp;
  const xpProgress = Math.min(100, ((xp % 500) / 500) * 100);

  // Topic pagination
  const TOPICS_PER_PAGE = 8;
  const sortedTopics = [...topicPerf].sort((a, b) => b.questions_attempted - a.questions_attempted);
  const totalTopicPages = Math.ceil(sortedTopics.length / TOPICS_PER_PAGE);
  const paginatedTopics = sortedTopics.slice((topicPage - 1) * TOPICS_PER_PAGE, topicPage * TOPICS_PER_PAGE);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/users/me/profile', { full_name: editName });
      useAuthStore.getState().setUser({ ...user!, full_name: editName });
      setEditing(false);
      toast.success('Profile updated');
    } catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const handleLogout = () => {
    useAuthStore.getState().logout();
    window.location.href = '/login';
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" /></div>;

  return (
    <>
      <Helmet>
        <title>Profile - ExamPrep</title>
        <meta name="description" content="Your ExamPrep profile with stats, badges, activity, and topic mastery." />
      </Helmet>

      <div className="mx-auto max-w-4xl space-y-6">
        {/* Profile header */}
        <div className="card overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary-500 via-purple-500 to-accent-500" />
          <div className="px-6 pb-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end -mt-10">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-primary-500 to-purple-600 text-2xl font-bold text-white shadow-lg dark:border-gray-900">
                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 text-center sm:text-left">
                {editing ? (
                  <div className="flex items-center gap-2">
                    <input value={editName} onChange={e => setEditName(e.target.value)} className="input text-lg font-bold" />
                    <button onClick={handleSaveProfile} disabled={saving} className="btn-primary text-sm">{saving ? '...' : 'Save'}</button>
                    <button onClick={() => setEditing(false)} className="btn-secondary text-sm">Cancel</button>
                  </div>
                ) : (
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user?.full_name || 'Student'}</h1>
                )}
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
              <div className="flex gap-2">
                {!editing && <button onClick={() => { setEditing(true); setEditName(user?.full_name || ''); }} className="btn-secondary text-sm">Edit Profile</button>}
                <button onClick={handleLogout} className="text-sm font-medium text-red-600 hover:text-red-700 px-3 py-2">Logout</button>
              </div>
            </div>

            {/* Quick stats badges */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
                🔥 {streak} day streak
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
                ⭐ Level {level}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-600 dark:bg-green-900/20 dark:text-green-400">
                ✨ {xp.toLocaleString()} XP
              </span>
              {usageData && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-600 capitalize dark:bg-purple-900/20 dark:text-purple-400">
                  👑 {usageData.plan} Plan
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                🏅 {earnedBadges.length}/{ALL_BADGES.length} badges
              </span>
            </div>

            {/* XP progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Level {level}</span>
                <span>{xpToNext > 0 ? `${xpToNext} XP to Level ${level + 1}` : 'Max level!'}</span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-purple-500 transition-all" style={{ width: `${xpProgress}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="card text-center"><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.total_questions_attempted?.toLocaleString() ?? '0'}</p><p className="text-xs text-gray-500">Questions</p></div>
          <div className="card text-center"><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats ? `${stats.accuracy_pct}%` : '0%'}</p><p className="text-xs text-gray-500">Accuracy</p></div>
          <div className="card text-center"><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.total_tests_taken?.toLocaleString() ?? '0'}</p><p className="text-xs text-gray-500">Tests Taken</p></div>
          <div className="card text-center"><p className="text-2xl font-bold text-gray-900 dark:text-white">{totalDaysActive}</p><p className="text-xs text-gray-500">Days Active (90d)</p></div>
          <div className="card text-center"><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.rank ? `#${stats.rank}` : '--'}</p><p className="text-xs text-gray-500">Global Rank</p></div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {(['overview', 'topics', 'badges', 'settings'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium capitalize transition-all ${activeTab === tab ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
            >{tab}</button>
          ))}
        </div>

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Activity heatmap */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Activity</h2>
                <span className="text-xs text-gray-400">{totalQuestionsLast90} questions in last 90 days</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {heatmapGrid.map(day => (
                  <div key={day.date} className={`h-3.5 w-3.5 rounded-sm ${getHeatmapColor(day.count)}`}
                    title={`${day.date}: ${day.count} question${day.count !== 1 ? 's' : ''}`} />
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <p className="text-xs text-gray-400">Last 90 days</p>
                <div className="ml-auto flex items-center gap-1 text-xs text-gray-400">
                  <span>Less</span>
                  {['bg-gray-100 dark:bg-gray-800', 'bg-green-200', 'bg-green-400', 'bg-green-500', 'bg-green-700'].map((c, i) => (
                    <div key={i} className={`h-3 w-3 rounded-sm ${c}`} />
                  ))}
                  <span>More</span>
                </div>
              </div>
            </div>

            {/* Performance summary */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="card">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Streaks</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Current Streak</span><span className="font-bold text-orange-600">{streak} days</span></div>
                  <div className="flex items-center justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Longest Streak</span><span className="font-bold text-gray-900 dark:text-white">{gamification?.longest_streak ?? 0} days</span></div>
                  <div className="flex items-center justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Total Active Days</span><span className="font-bold text-gray-900 dark:text-white">{totalDaysActive}</span></div>
                </div>
              </div>
              <div className="card">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Performance</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Total Correct</span><span className="font-bold text-green-600">{stats?.total_correct ?? 0}</span></div>
                  <div className="flex items-center justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Total Wrong</span><span className="font-bold text-red-600">{(stats?.total_questions_attempted ?? 0) - (stats?.total_correct ?? 0)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Accuracy</span><span className="font-bold text-primary-600">{stats?.accuracy_pct ?? 0}%</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Topics tab */}
        {activeTab === 'topics' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Topic Mastery</h2>
              <span className="text-xs text-gray-400">{sortedTopics.length} topics practiced</span>
            </div>
            {sortedTopics.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">Start practicing to see your topic mastery.</p>
            ) : (
              <>
                <div className="space-y-4">
                  {paginatedTopics.map((topic, i) => {
                    const mastery = Math.min(topic.mastery_level * 100, 100);
                    const color = mastery >= 80 ? 'bg-green-500' : mastery >= 50 ? 'bg-yellow-500' : mastery >= 25 ? 'bg-orange-500' : 'bg-red-500';
                    return (
                      <div key={topic.topic_id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{topic.topic_name}</p>
                            <p className="text-xs text-gray-400">{topic.questions_correct}/{topic.questions_attempted} correct · Avg {topic.avg_time_seconds.toFixed(0)}s</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{topic.accuracy_pct.toFixed(0)}%</p>
                            <p className="text-xs text-gray-400">accuracy</p>
                          </div>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                          <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${mastery}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalTopicPages > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <button onClick={() => setTopicPage(p => Math.max(1, p - 1))} disabled={topicPage === 1} className="btn-secondary text-sm disabled:opacity-40">Prev</button>
                    <span className="text-sm text-gray-500">Page {topicPage} of {totalTopicPages}</span>
                    <button onClick={() => setTopicPage(p => Math.min(totalTopicPages, p + 1))} disabled={topicPage === totalTopicPages} className="btn-secondary text-sm disabled:opacity-40">Next</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Badges tab */}
        {activeTab === 'badges' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Badges</h2>
              <span className="text-xs text-gray-400">{earnedBadges.length}/{ALL_BADGES.length} earned</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ALL_BADGES.map(badge => {
                const meta = BADGE_META[badge];
                const earned = earnedBadges.includes(badge);
                return (
                  <div key={badge} className={`rounded-xl border-2 p-4 transition-all ${earned ? 'border-primary-300 bg-gradient-to-br from-primary-50 to-purple-50 dark:border-primary-700 dark:from-primary-900/20 dark:to-purple-900/20' : 'border-gray-200 opacity-50 dark:border-gray-700'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${earned ? `bg-gradient-to-br ${meta.color} text-white shadow-lg` : 'bg-gray-100 dark:bg-gray-800'}`}>
                        {meta.icon}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${earned ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>{meta.label}</p>
                        <p className="text-xs text-gray-400">{meta.desc}</p>
                      </div>
                    </div>
                    {earned && <p className="mt-2 text-xs text-green-600 font-medium">Earned ✓</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Settings tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="card">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Account Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                  <div><p className="text-sm font-medium text-gray-900 dark:text-white">Email</p><p className="text-xs text-gray-500">{user?.email}</p></div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                  <div><p className="text-sm font-medium text-gray-900 dark:text-white">Subscription</p><p className="text-xs text-gray-500 capitalize">{usageData?.plan || 'Free'} Plan</p></div>
                  <Link to="/subscription" className="text-sm font-medium text-primary-600 hover:underline">Manage</Link>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                  <div><p className="text-sm font-medium text-gray-900 dark:text-white">Member Since</p><p className="text-xs text-gray-500">{user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</p></div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Danger Zone</h3>
              <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/10">
                <div><p className="text-sm font-medium text-red-700 dark:text-red-400">Delete Account</p><p className="text-xs text-red-500">Permanently delete your account and all data</p></div>
                <button onClick={() => { if (confirm('Are you sure? This cannot be undone.')) { apiClient.delete('/users/me').then(() => { toast.success('Account deleted'); handleLogout(); }).catch(() => toast.error('Failed')); } }}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
