import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/lib/api/client';

interface ScheduledTest {
  id: string; title: string; description: string | null; exam_id: string;
  duration_minutes: number; total_marks: number; is_scheduled: boolean;
  scheduled_at: string | null; question_count: number; test_type: string;
}

export default function ScheduledTestsPage() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<ScheduledTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    apiClient.get('/tests').then(r => {
      const all = r.data.data || [];
      setTests(all.filter((t: any) => t.is_scheduled && t.scheduled_at));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Update "now" every second for countdown
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv); }, []);

  const formatCountdown = (targetMs: number) => {
    const diff = Math.max(0, targetMs - now);
    if (diff === 0) return 'Starting now!';
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const handleJoin = async (testId: string) => {
    try {
      const res = await apiClient.post(`/tests/${testId}/start`);
      navigate(`/tests/session/${res.data.data.attempt.id}`, { state: { attemptData: res.data.data } });
    } catch { /* silent */ }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" /></div>;

  const upcoming = tests.filter(t => new Date(t.scheduled_at!).getTime() > now - 3600000).sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());
  const past = tests.filter(t => new Date(t.scheduled_at!).getTime() <= now - 3600000);

  return (
    <>
      <Helmet><title>Scheduled Tests - ExamPrep</title></Helmet>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scheduled Tests</h1>
          <p className="mt-1 text-sm text-gray-500">Join live mock tests at scheduled times for real exam simulation</p>
        </div>

        {upcoming.length === 0 && past.length === 0 && (
          <div className="card py-16 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">No Scheduled Tests</h2>
            <p className="mt-1 text-sm text-gray-500">Check back later for upcoming scheduled mock tests</p>
          </div>
        )}

        {upcoming.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map(t => {
                const scheduledMs = new Date(t.scheduled_at!).getTime();
                const canJoin = scheduledMs <= now;
                return (
                  <div key={t.id} className={`card border-2 ${canJoin ? 'border-green-400 bg-green-50/50 dark:border-green-600 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{t.title}</h3>
                    {t.description && <p className="mt-1 text-xs text-gray-500">{t.description}</p>}
                    <div className="mt-3 space-y-1 text-xs text-gray-500">
                      <p>📅 {new Date(t.scheduled_at!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      <p>⏱ {t.duration_minutes} minutes | 📝 {t.total_marks} marks</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`text-sm font-bold ${canJoin ? 'text-green-600 animate-pulse' : scheduledMs - now < 3600000 ? 'text-orange-600' : 'text-gray-500'}`}>
                        {formatCountdown(scheduledMs)}
                      </span>
                      <button onClick={() => handleJoin(t.id)} disabled={!canJoin}
                        className={`rounded-lg px-4 py-1.5 text-sm font-medium ${canJoin ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700'}`}>
                        {canJoin ? 'Join Now' : 'Waiting...'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {past.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-gray-500">Past Scheduled Tests</h2>
            <div className="space-y-2">
              {past.map(t => (
                <div key={t.id} className="card flex items-center justify-between opacity-60">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.title}</p>
                    <p className="text-xs text-gray-400">{new Date(t.scheduled_at!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} | {t.duration_minutes}min</p>
                  </div>
                  <span className="text-xs text-gray-400">Ended</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
