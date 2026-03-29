import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../lib/api/client';
import toast from 'react-hot-toast';

export default function AdminUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [grantPlan, setGrantPlan] = useState('pro');
  const [grantDays, setGrantDays] = useState(30);

  const load = () => {
    if (!userId) return;
    setLoading(true);
    apiClient.get(`/admin/users/${userId}/detail`).then(r => setData(r.data.data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [userId]);

  const toggleActive = async () => {
    await apiClient.patch(`/admin/users/${userId}`, { is_active: !data.user.is_active });
    toast.success(data.user.is_active ? 'User suspended' : 'User activated');
    load();
  };

  const changeRole = async (role: string) => {
    await apiClient.patch(`/admin/users/${userId}/role`, { role });
    toast.success(`Role changed to ${role}`);
    load();
  };

  const grantSubscription = async () => {
    await apiClient.patch(`/admin/users/${userId}/subscription`, { plan: grantPlan, days: grantDays });
    toast.success(`Granted ${grantPlan} for ${grantDays} days`);
    load();
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" /></div>;
  if (!data) return <div className="text-center text-gray-500">User not found</div>;

  const { user: u, gamification: g, subscription: sub, stats: s, recent_sessions: sessions } = data;

  return (
    <>
      <Helmet><title>User: {u.full_name} - Admin | ExamPrep</title></Helmet>
      <div className="space-y-6">
        <button onClick={() => navigate('/admin/users')} className="text-sm text-primary-600 hover:underline">&larr; Back to Users</button>

        {/* Header */}
        <div className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-600">{u.full_name?.charAt(0) || '?'}</div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{u.full_name}</h1>
              <p className="text-sm text-gray-500">{u.email}</p>
              <div className="mt-1 flex gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{u.role}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{u.is_active ? 'Active' : 'Suspended'}</span>
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 capitalize">{sub.plan}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleActive} className={`text-sm font-medium ${u.is_active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}>
              {u.is_active ? 'Suspend' : 'Activate'}
            </button>
            <select value={u.role} onChange={e => changeRole(e.target.value)} className="input text-sm">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="card text-center"><p className="text-2xl font-bold text-gray-900 dark:text-white">{s.total_sessions}</p><p className="text-xs text-gray-500">Sessions</p></div>
          <div className="card text-center"><p className="text-2xl font-bold text-gray-900 dark:text-white">{s.total_answers}</p><p className="text-xs text-gray-500">Answers</p></div>
          <div className="card text-center"><p className="text-2xl font-bold text-green-600">{s.correct_answers}</p><p className="text-xs text-gray-500">Correct</p></div>
          <div className="card text-center"><p className="text-2xl font-bold text-primary-600">{s.accuracy}%</p><p className="text-xs text-gray-500">Accuracy</p></div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Gamification */}
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Gamification</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">XP</span><span className="font-bold">{g.xp}</span></div>
              <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Level</span><span className="font-bold">{g.level}</span></div>
              <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Streak</span><span className="font-bold">{g.streak} days</span></div>
              <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Badges</span><span className="font-bold">{g.badges}</span></div>
            </div>
          </div>

          {/* Grant subscription */}
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Grant Subscription</h3>
            <p className="text-xs text-gray-400 mb-2">Current: <strong className="capitalize">{sub.plan}</strong>{sub.expires_at && ` (expires ${new Date(sub.expires_at).toLocaleDateString()})`}</p>
            <div className="flex gap-2">
              <select value={grantPlan} onChange={e => setGrantPlan(e.target.value)} className="input text-sm flex-1">
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
                <option value="free">Free (cancel)</option>
              </select>
              <input type="number" value={grantDays} onChange={e => setGrantDays(Number(e.target.value))} className="input w-20 text-sm" min={1} max={365} />
              <button onClick={grantSubscription} className="btn-primary text-sm">Grant</button>
            </div>
          </div>
        </div>

        {/* Recent sessions */}
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Recent Sessions</h3>
          {sessions.length === 0 ? <p className="text-sm text-gray-500">No sessions</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <tr><th className="px-3 py-2">Status</th><th className="px-3 py-2">Questions</th><th className="px-3 py-2">Correct</th><th className="px-3 py-2">Wrong</th><th className="px-3 py-2">Date</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {sessions.map((s: any) => (
                    <tr key={s.id}>
                      <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{s.status}</span></td>
                      <td className="px-3 py-2">{s.total_questions}</td>
                      <td className="px-3 py-2 text-green-600">{s.correct_count}</td>
                      <td className="px-3 py-2 text-red-600">{s.wrong_count}</td>
                      <td className="px-3 py-2 text-gray-500">{new Date(s.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
