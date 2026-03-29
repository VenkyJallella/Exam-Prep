import toast from 'react-hot-toast';

interface MilestoneConfig {
  threshold: number;
  title: string;
  message: string;
  icon: string;
}

const MILESTONES: MilestoneConfig[] = [
  { threshold: 1, title: 'First Question!', message: 'You answered your first question. The journey begins!', icon: '🎯' },
  { threshold: 10, title: '10 Questions Done!', message: 'You are warming up. Keep going!', icon: '🔥' },
  { threshold: 25, title: '25 Questions!', message: 'Quarter century! You are building momentum.', icon: '💪' },
  { threshold: 50, title: 'Half Century!', message: '50 questions answered. You are on a roll!', icon: '⚡' },
  { threshold: 100, title: '100 Club!', message: 'Triple digits! You are a serious aspirant.', icon: '💯' },
  { threshold: 250, title: '250 Questions!', message: 'You are in the top 20% of aspirants!', icon: '🌟' },
  { threshold: 500, title: '500 Questions!', message: 'Half a thousand! You are elite.', icon: '🏆' },
  { threshold: 1000, title: '1000 Club!', message: 'You are in the top 1% of all aspirants!', icon: '👑' },
];

const STREAK_MILESTONES: MilestoneConfig[] = [
  { threshold: 3, title: '3-Day Streak!', message: '+50 XP bonus! Keep the fire alive.', icon: '🔥' },
  { threshold: 7, title: 'Week Warrior!', message: '+200 XP bonus! 7 days strong!', icon: '⚔️' },
  { threshold: 14, title: 'Two Week Champion!', message: '+500 XP bonus! Consistency is key.', icon: '🏅' },
  { threshold: 30, title: 'Streak Master!', message: '+1000 XP bonus! 30 days of dedication!', icon: '👑' },
];

const ACCURACY_MILESTONES: MilestoneConfig[] = [
  { threshold: 50, title: 'Above Average!', message: 'Your accuracy is above 50%. Well done!', icon: '📈' },
  { threshold: 70, title: 'Sharp Mind!', message: '70%+ accuracy. You are getting exam-ready!', icon: '🧠' },
  { threshold: 90, title: 'Near Perfect!', message: '90%+ accuracy. You are topper material!', icon: '🎓' },
];

export function checkAndShowMilestone(questionsAnswered: number, previousCount: number) {
  for (const m of MILESTONES) {
    if (questionsAnswered >= m.threshold && previousCount < m.threshold) {
      showAchievementToast(m);
      return;
    }
  }
}

export function checkStreakMilestone(currentStreak: number) {
  for (const m of STREAK_MILESTONES) {
    if (currentStreak === m.threshold) {
      showAchievementToast(m);
      return;
    }
  }
}

export function checkAccuracyMilestone(accuracy: number, questionsAnswered: number) {
  if (questionsAnswered < 20) return; // Need minimum sample
  for (const m of ACCURACY_MILESTONES) {
    if (accuracy >= m.threshold) {
      showAchievementToast(m);
      return;
    }
  }
}

function showAchievementToast(milestone: MilestoneConfig) {
  toast.custom(
    (t) => (
      <div
        className={`${t.visible ? 'animate-enter' : 'animate-leave'} pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 p-4 shadow-lg dark:border-yellow-800 dark:from-yellow-900/30 dark:to-orange-900/30`}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-2xl shadow-md">
          {milestone.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white">{milestone.title}</p>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">{milestone.message}</p>
        </div>
        <button onClick={() => toast.dismiss(t.id)} className="shrink-0 text-gray-400 hover:text-gray-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    ),
    { duration: 5000, position: 'top-center' }
  );
}

export function showShareToast(score: number, total: number, quizType: string) {
  const percentage = Math.round((score / total) * 100);
  const text = `I scored ${score}/${total} (${percentage}%) on ${quizType} at ExamPrep! Can you beat me? 🎯`;

  toast.custom(
    (t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} pointer-events-auto flex w-full max-w-sm flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900`}>
        <p className="text-sm font-medium text-gray-900 dark:text-white">Share your score!</p>
        <p className="text-xs text-gray-600 dark:text-gray-400">{text}</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
              toast.dismiss(t.id);
            }}
            className="flex-1 rounded-lg bg-green-500 py-1.5 text-xs font-medium text-white hover:bg-green-600"
          >
            WhatsApp
          </button>
          <button
            onClick={() => {
              window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
              toast.dismiss(t.id);
            }}
            className="flex-1 rounded-lg bg-blue-500 py-1.5 text-xs font-medium text-white hover:bg-blue-600"
          >
            Twitter
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(text);
              toast.success('Copied to clipboard!');
              toast.dismiss(t.id);
            }}
            className="flex-1 rounded-lg bg-gray-200 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
          >
            Copy
          </button>
        </div>
      </div>
    ),
    { duration: 10000, position: 'top-center' }
  );
}
