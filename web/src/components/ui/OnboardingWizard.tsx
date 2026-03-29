import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/lib/api/client';
import { examsAPI, type Exam } from '@/lib/api/exams';
import toast from 'react-hot-toast';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [dailyGoal, setDailyGoal] = useState(3);
  const [targetDate, setTargetDate] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    examsAPI.list().then(r => setExams(r.data.data)).catch(() => {});
  }, []);

  const handleFinish = async () => {
    setCreating(true);
    try {
      // Create study plan if exam selected
      if (selectedExam && targetDate) {
        await apiClient.post('/study/plan', {
          exam_id: selectedExam.id,
          target_date: targetDate,
          daily_hours: dailyGoal,
        }).catch(() => {});
      }

      // Mark onboarding complete
      localStorage.setItem('examprep_onboarded', 'true');
      toast.success('Welcome to ExamPrep! Let\'s start practicing.');
      onComplete();

      // Navigate to practice or daily quiz
      navigate('/practice');
    } catch {
      onComplete();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-primary-600 via-purple-600 to-accent-600 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl dark:bg-gray-900">
        {/* Progress */}
        <div className="mb-6 flex gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
          ))}
        </div>

        {/* Step 1: Welcome + Select Exam */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-3xl dark:bg-primary-900/30">🎯</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to ExamPrep!</h2>
              <p className="mt-2 text-sm text-gray-500">Let's set up your preparation in 30 seconds</p>
            </div>
            <div>
              <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Which exam are you preparing for?</p>
              <div className="grid grid-cols-2 gap-3">
                {exams.map(e => (
                  <button key={e.id} onClick={() => setSelectedExam(e)}
                    className={`rounded-xl border-2 p-3 text-center text-sm font-medium transition-all ${selectedExam?.id === e.id ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/20' : 'border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300'}`}>
                    {e.name}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setStep(2)} disabled={!selectedExam}
              className="btn-primary w-full py-3 disabled:opacity-50">Next</button>
          </div>
        )}

        {/* Step 2: Set Goals */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-3xl dark:bg-green-900/30">📅</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Set Your Goals</h2>
              <p className="mt-2 text-sm text-gray-500">We'll create a personalized study plan for you</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">When is your exam?</label>
              <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]} className="input w-full" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Daily study hours: {dailyGoal}h</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 8].map(h => (
                  <button key={h} onClick={() => setDailyGoal(h)}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium ${dailyGoal === h ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                    {h}h
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
              <button onClick={() => setStep(3)} className="btn-primary flex-1">Next</button>
            </div>
          </div>
        )}

        {/* Step 3: Ready */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-100 text-3xl dark:bg-yellow-900/30">🚀</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">You're All Set!</h2>
              <p className="mt-2 text-sm text-gray-500">Here's your preparation summary</p>
            </div>
            <div className="space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Target Exam</span>
                <span className="font-semibold text-gray-900 dark:text-white">{selectedExam?.name}</span>
              </div>
              {targetDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Exam Date</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{new Date(targetDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Daily Goal</span>
                <span className="font-semibold text-gray-900 dark:text-white">{dailyGoal} hours</span>
              </div>
            </div>
            <div className="rounded-xl bg-primary-50 p-4 text-sm text-primary-700 dark:bg-primary-900/20 dark:text-primary-400">
              <p className="font-medium">What's included for free:</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>✓ 10 practice sessions/day with 20 questions each</li>
                <li>✓ Daily Quiz with leaderboard</li>
                <li>✓ All coding problems</li>
                <li>✓ AI-powered adaptive difficulty</li>
                <li>✓ Mistake book + flashcard review</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
              <button onClick={handleFinish} disabled={creating} className="btn-primary flex-1 py-3">
                {creating ? 'Setting up...' : 'Start Practicing!'}
              </button>
            </div>
          </div>
        )}

        {/* Skip */}
        <button onClick={() => { localStorage.setItem('examprep_onboarded', 'true'); onComplete(); }}
          className="mt-4 block w-full text-center text-xs text-gray-400 hover:text-gray-600">
          Skip setup
        </button>
      </div>
    </div>
  );
}
