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

const DAY_COLORS: Record<string, string> = {
  monday: 'border-l-blue-500',
  tuesday: 'border-l-green-500',
  wednesday: 'border-l-purple-500',
  thursday: 'border-l-orange-500',
  friday: 'border-l-pink-500',
  saturday: 'border-l-yellow-500',
  sunday: 'border-l-red-500',
};

export default function StudyPlannerPage() {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [selectedExam, setSelectedExam] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [dailyHours, setDailyHours] = useState(3);

  const loadPlan = async () => {
    setLoading(true);
    try {
      const [planRes, examsRes] = await Promise.all([
        apiClient.get('/study/plan'),
        examsAPI.list(),
      ]);
      setPlan(planRes.data.data);
      setExams(examsRes.data.data);
    } catch {
      toast.error('Failed to load study plan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlan(); }, []);

  const handleCreate = async () => {
    if (!selectedExam || !targetDate) {
      toast.error('Please select exam and target date');
      return;
    }
    setCreating(true);
    try {
      const res = await apiClient.post('/study/plan', {
        exam_id: selectedExam,
        target_date: targetDate,
        daily_hours: dailyHours,
      });
      setPlan(res.data.data);
      setShowCreate(false);
      toast.success('Study plan created!');
    } catch {
      toast.error('Failed to create plan');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!plan || !confirm('Delete your study plan?')) return;
    try {
      await apiClient.delete(`/study/plan/${plan.id}`);
      setPlan(null);
      toast.success('Plan deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const daysUntilExam = plan
    ? Math.max(0, Math.ceil((new Date(plan.target_date).getTime() - Date.now()) / 86400000))
    : 0;

  const examName = plan ? exams.find((e) => e.id === plan.exam_id)?.name || '' : '';

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Study Planner - ExamPrep</title></Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Study Planner</h1>
            <p className="mt-1 text-sm text-gray-500">Organize your preparation with a structured schedule</p>
          </div>
          {plan ? (
            <button onClick={handleDelete} className="text-sm font-medium text-red-600 hover:text-red-700">
              Delete Plan
            </button>
          ) : (
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              Create Plan
            </button>
          )}
        </div>

        {!plan && !showCreate && (
          <div className="card py-16 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">No Study Plan Yet</h2>
            <p className="mt-1 text-sm text-gray-500">Create a personalized study plan based on your target exam</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
              Create Your Plan
            </button>
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
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Daily Study Hours</label>
                <select value={dailyHours} onChange={(e) => setDailyHours(Number(e.target.value))} className="input w-full">
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((h) => <option key={h} value={h}>{h} hours</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCreate} disabled={creating} className="btn-primary">
                {creating ? 'Creating...' : 'Generate Schedule'}
              </button>
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}

        {/* Plan display */}
        {plan && (
          <>
            {/* Countdown */}
            <div className="card flex items-center justify-between bg-gradient-to-r from-primary-50 to-indigo-50 dark:from-primary-900/20 dark:to-indigo-900/20">
              <div>
                <p className="text-sm text-gray-500">Preparing for</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{examName}</p>
                <p className="text-sm text-gray-500">Target: {new Date(plan.target_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div className="text-center">
                <p className={`text-4xl font-bold ${daysUntilExam <= 30 ? 'text-red-600' : daysUntilExam <= 90 ? 'text-yellow-600' : 'text-primary-600'}`}>
                  {daysUntilExam}
                </p>
                <p className="text-sm text-gray-500">days left</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{plan.daily_hours}h</p>
                <p className="text-sm text-gray-500">daily target</p>
              </div>
            </div>

            {/* Weekly schedule */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Weekly Schedule</h2>
              <div className="space-y-3">
                {plan.schedule.map((day) => (
                  <div
                    key={day.day}
                    className={`card border-l-4 ${DAY_COLORS[day.day] || 'border-l-gray-300'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold capitalize text-gray-900 dark:text-white">{day.day}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            day.type === 'revision'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                            {day.type}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-primary-600">{day.subject}</p>
                        {day.topics.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {day.topics.map((t) => (
                              <span key={t.id} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                {t.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {day.hours}h
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total weekly hours */}
            <div className="card text-center">
              <p className="text-sm text-gray-500">Total Weekly Study Time</p>
              <p className="text-3xl font-bold text-primary-600">
                {plan.schedule.reduce((sum, d) => sum + d.hours, 0)}h
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
