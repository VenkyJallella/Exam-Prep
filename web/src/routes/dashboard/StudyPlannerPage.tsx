import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { examsAPI, type Exam } from '@/lib/api/exams';
import apiClient from '@/lib/api/client';
import toast from 'react-hot-toast';

interface ScheduleDay {
  day: string;
  subject: string;
  subject_id: string | null;
  topics: { id: string; name: string }[];
  hours: number;
  type: string;
}

interface StudyPlan {
  id: string;
  exam_id: string;
  target_date: string;
  daily_hours: number;
  schedule: ScheduleDay[];
  created_at: string;
}

interface TodayTask {
  subject: string;
  topics: { id: string; name: string }[];
  hours: number;
  type: string;
  completed: boolean;
}

const DAY_COLORS: Record<string, string> = {
  monday: 'border-l-blue-500',
  tuesday: 'border-l-green-500',
  wednesday: 'border-l-purple-500',
  thursday: 'border-l-orange-500',
  friday: 'border-l-pink-500',
  saturday: 'border-l-yellow-500',
  sunday: 'border-l-red-500',
};

const DAY_BG: Record<string, string> = {
  monday: 'bg-blue-500',
  tuesday: 'bg-green-500',
  wednesday: 'bg-purple-500',
  thursday: 'bg-orange-500',
  friday: 'bg-pink-500',
  saturday: 'bg-yellow-500',
  sunday: 'bg-red-500',
};

export default function StudyPlannerPage() {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [todayTask, setTodayTask] = useState<TodayTask | null>(null);
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'progress'>('today');

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [selectedExam, setSelectedExam] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [dailyHours, setDailyHours] = useState(3);

  // Study log
  const [logging, setLogging] = useState(false);
  const [logMinutes, setLogMinutes] = useState(60);
  const [logNotes, setLogNotes] = useState('');
  const [showLogModal, setShowLogModal] = useState(false);
  const [studyLogs, setStudyLogs] = useState<any[]>([]);

  const loadAll = async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      apiClient.get('/study/plan'),
      examsAPI.list(),
      apiClient.get('/study/today'),
    ]);
    if (results[0].status === 'fulfilled') setPlan(results[0].value.data.data);
    if (results[1].status === 'fulfilled') setExams(results[1].value.data.data);
    if (results[2].status === 'fulfilled') setTodayTask(results[2].value.data.data);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const handleCreate = async () => {
    if (!selectedExam || !targetDate) { toast.error('Select exam and target date'); return; }
    setCreating(true);
    try {
      const res = await apiClient.post('/study/plan', { exam_id: selectedExam, target_date: targetDate, daily_hours: dailyHours });
      setPlan(res.data.data);
      setShowCreate(false);
      toast.success('Study plan created!');
      loadAll();
    } catch { toast.error('Failed to create plan'); }
    finally { setCreating(false); }
  };

  const handleDelete = async () => {
    if (!plan || !confirm('Delete your study plan?')) return;
    try {
      await apiClient.delete(`/study/plan/${plan.id}`);
      setPlan(null);
      setTodayTask(null);
      toast.success('Plan deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const handleLogStudy = async () => {
    if (!plan) return;
    setLogging(true);
    try {
      await apiClient.post('/study/log', {
        plan_id: plan.id,
        duration_minutes: logMinutes,
        notes: logNotes || undefined,
      });
      toast.success(`Logged ${logMinutes} minutes of study!`);
      setShowLogModal(false);
      setLogNotes('');
      loadAll();
    } catch { toast.error('Failed to log study'); }
    finally { setLogging(false); }
  };

  const daysUntilExam = plan ? Math.max(0, Math.ceil((new Date(plan.target_date).getTime() - Date.now()) / 86400000)) : 0;
  const examName = plan ? exams.find((e) => e.id === plan.exam_id)?.name || '' : '';
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const todaySchedule = plan?.schedule.find((d) => d.day === todayDayName);
  const totalWeeklyHours = plan?.schedule.reduce((sum, d) => sum + d.hours, 0) || 0;
  const weeksLeft = Math.ceil(daysUntilExam / 7);
  const totalStudyHours = weeksLeft * totalWeeklyHours;

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" /></div>;
  }

  return (
    <>
      <Helmet>
        <title>Study Planner - ExamPrep</title>
        <meta name="description" content="Advanced AI-powered study planner for competitive exam preparation." />
      </Helmet>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Study Planner</h1>
            <p className="mt-1 text-sm text-gray-500">Organize your preparation with a structured schedule</p>
          </div>
          <div className="flex gap-2">
            {plan && (
              <>
                <button onClick={() => setShowLogModal(true)} className="btn-primary text-sm">
                  Log Study
                </button>
                <button onClick={handleDelete} className="text-sm font-medium text-red-600 hover:text-red-700">Delete</button>
              </>
            )}
            {!plan && <button onClick={() => setShowCreate(true)} className="btn-primary">Create Plan</button>}
          </div>
        </div>

        {/* No plan state */}
        {!plan && !showCreate && (
          <div className="card py-16 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">No Study Plan Yet</h2>
            <p className="mt-1 text-sm text-gray-500">Create a personalized study plan based on your target exam</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">Create Your Plan</button>
          </div>
        )}

        {/* Create form */}
        {showCreate && !plan && (
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Study Plan</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Target Exam</label>
                <select value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)} className="input w-full">
                  <option value="">Select exam</option>
                  {exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Exam Date</label>
                <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="input w-full" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Daily Study Hours</label>
                <select value={dailyHours} onChange={(e) => setDailyHours(Number(e.target.value))} className="input w-full">
                  {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((h) => <option key={h} value={h}>{h} hours</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCreate} disabled={creating} className="btn-primary">{creating ? 'Creating...' : 'Generate Schedule'}</button>
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}

        {/* Plan dashboard */}
        {plan && (
          <>
            {/* Stats row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="card text-center">
                <p className={`text-3xl font-bold ${daysUntilExam <= 30 ? 'text-red-600' : daysUntilExam <= 90 ? 'text-yellow-600' : 'text-primary-600'}`}>
                  {daysUntilExam}
                </p>
                <p className="text-sm text-gray-500">Days Left</p>
                <p className="mt-1 text-xs text-gray-400">{new Date(plan.target_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <div className="card text-center">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{examName}</p>
                <p className="text-sm text-gray-500">Target Exam</p>
              </div>
              <div className="card text-center">
                <p className="text-3xl font-bold text-green-600">{plan.daily_hours}h</p>
                <p className="text-sm text-gray-500">Daily Target</p>
                <p className="mt-1 text-xs text-gray-400">{totalWeeklyHours}h/week</p>
              </div>
              <div className="card text-center">
                <p className="text-3xl font-bold text-purple-600">{totalStudyHours}h</p>
                <p className="text-sm text-gray-500">Total Study Hours Left</p>
                <p className="mt-1 text-xs text-gray-400">{weeksLeft} weeks remaining</p>
              </div>
            </div>

            {/* Today's focus card */}
            {todaySchedule && (
              <div className={`card border-l-4 ${DAY_COLORS[todayDayName]} bg-gradient-to-r from-white to-gray-50 dark:from-gray-950 dark:to-gray-900`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${DAY_BG[todayDayName] || 'bg-gray-500'}`}>
                        {todayDayName.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Today's Focus</p>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{todaySchedule.subject}</h3>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {todaySchedule.topics.map((t) => (
                        <span key={t.id} className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-400">
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{todaySchedule.hours}h</p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      todaySchedule.type === 'revision' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                    }`}>{todaySchedule.type}</span>
                    <div className="mt-2">
                      <button onClick={() => setShowLogModal(true)} className="btn-primary text-xs">
                        Log Study Session
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
              {(['today', 'week', 'progress'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 rounded-md px-4 py-2 text-sm font-medium capitalize transition-all ${
                    activeTab === tab ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'today' ? "Today's Plan" : tab === 'week' ? 'Weekly Schedule' : 'Progress'}
                </button>
              ))}
            </div>

            {/* Today tab */}
            {activeTab === 'today' && todaySchedule && (
              <div className="space-y-4">
                <div className="card">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Study Checklist</h3>
                  <div className="space-y-2">
                    {todaySchedule.topics.map((topic, i) => (
                      <label key={topic.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 cursor-pointer">
                        <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-primary-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{topic.name}</p>
                          <p className="text-xs text-gray-500">{todaySchedule.subject} · ~{Math.round(todaySchedule.hours / todaySchedule.topics.length * 60)} min</p>
                        </div>
                        <span className="text-xs text-gray-400">Topic {i + 1}/{todaySchedule.topics.length}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Study Tips for {todaySchedule.subject}</h3>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p>• Start with a quick 10-min revision of previous session's topics</p>
                    <p>• Focus on understanding concepts before solving problems</p>
                    <p>• Take a 5-min break every 45 minutes (Pomodoro technique)</p>
                    <p>• End with 15 minutes of practice questions on today's topics</p>
                  </div>
                </div>
              </div>
            )}

            {/* Week tab */}
            {activeTab === 'week' && (
              <div className="space-y-3">
                {plan.schedule.map((day) => {
                  const isToday = day.day === todayDayName;
                  return (
                    <div key={day.day} className={`card border-l-4 ${DAY_COLORS[day.day] || 'border-l-gray-300'} ${isToday ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-900' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold capitalize text-gray-900 dark:text-white">
                              {day.day} {isToday && <span className="text-xs font-normal text-primary-600">(Today)</span>}
                            </h3>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              day.type === 'revision' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>{day.type}</span>
                          </div>
                          <p className="mt-1 text-sm font-medium text-primary-600">{day.subject}</p>
                          {day.topics.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {day.topics.map((t) => (
                                <span key={t.id} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">{t.name}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">{day.hours}h</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="card text-center bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/10 dark:to-purple-900/10">
                  <p className="text-sm text-gray-500">Total Weekly Study Time</p>
                  <p className="text-3xl font-bold text-primary-600">{totalWeeklyHours}h</p>
                </div>
              </div>
            )}

            {/* Progress tab */}
            {activeTab === 'progress' && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="card text-center">
                    <p className="text-sm text-gray-500">Completion</p>
                    <div className="relative mx-auto mt-2 h-24 w-24">
                      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" className="dark:stroke-gray-700" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="8"
                          strokeDasharray={`${Math.min(100, Math.round(((plan.schedule.length * 7 - daysUntilExam) / (plan.schedule.length * 7)) * 100)) * 2.51} 251`}
                          strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {Math.min(100, Math.round(((plan.schedule.length * 7 - daysUntilExam) / Math.max(1, plan.schedule.length * 7)) * 100))}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="card text-center">
                    <p className="text-sm text-gray-500">Subjects Covered</p>
                    <p className="mt-2 text-3xl font-bold text-green-600">{new Set(plan.schedule.map(s => s.subject)).size}</p>
                    <p className="text-xs text-gray-400">unique subjects</p>
                  </div>
                  <div className="card text-center">
                    <p className="text-sm text-gray-500">Topics to Cover</p>
                    <p className="mt-2 text-3xl font-bold text-orange-600">{plan.schedule.reduce((sum, d) => sum + d.topics.length, 0)}</p>
                    <p className="text-xs text-gray-400">across all days</p>
                  </div>
                </div>

                <div className="card">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Subject Distribution</h3>
                  <div className="space-y-3">
                    {(() => {
                      const subjects: Record<string, number> = {};
                      plan.schedule.forEach(d => { subjects[d.subject] = (subjects[d.subject] || 0) + d.hours; });
                      const maxH = Math.max(...Object.values(subjects));
                      return Object.entries(subjects).map(([subj, hrs]) => (
                        <div key={subj}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-300">{subj}</span>
                            <span className="text-gray-500">{hrs}h/week</span>
                          </div>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                            <div className="h-full rounded-full bg-primary-500" style={{ width: `${(hrs / maxH) * 100}%` }} />
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                <div className="card">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Preparation Milestones</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Plan Created', done: true, date: new Date(plan.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) },
                      { label: 'First Week Completed', done: daysUntilExam < (Math.ceil((new Date(plan.target_date).getTime() - new Date(plan.created_at).getTime()) / 86400000) - 7), date: '' },
                      { label: 'Halfway Mark', done: daysUntilExam < Math.ceil((new Date(plan.target_date).getTime() - new Date(plan.created_at).getTime()) / 86400000) / 2, date: '' },
                      { label: 'Revision Phase', done: daysUntilExam <= 14, date: daysUntilExam <= 14 ? 'Now!' : `In ${daysUntilExam - 14} days` },
                      { label: 'Exam Day', done: false, date: new Date(plan.target_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
                    ].map((m, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${m.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-700'}`}>
                          {m.done ? (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          ) : (
                            <span className="text-xs font-bold">{i + 1}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${m.done ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>{m.label}</p>
                          {m.date && <p className="text-xs text-gray-400">{m.date}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Log Study Modal */}
      {showLogModal && plan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Log Study Session</h2>
            <p className="mt-1 text-sm text-gray-500">Record what you studied today</p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Duration</label>
                <div className="mt-1 flex gap-2">
                  {[15, 30, 45, 60, 90, 120, 180].map((m) => (
                    <button key={m} onClick={() => setLogMinutes(m)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${logMinutes === m ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'}`}
                    >
                      {m >= 60 ? `${m / 60}h` : `${m}m`}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes (optional)</label>
                <textarea value={logNotes} onChange={(e) => setLogNotes(e.target.value)} rows={3} className="input mt-1 w-full" placeholder="What did you cover?" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowLogModal(false)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleLogStudy} disabled={logging} className="btn-primary text-sm">{logging ? 'Logging...' : 'Log Session'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
