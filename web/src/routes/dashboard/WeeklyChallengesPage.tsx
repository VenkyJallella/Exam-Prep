import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import apiClient from '@/lib/api/client';

interface Challenge { id: string; title: string; description: string; target: number; progress: number; completed: boolean; xp_reward: number; type: string; }

export default function WeeklyChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/challenges').then(r => {
      setChallenges(r.data.data.challenges);
      setStats(r.data.data.stats);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" /></div>;

  const completedCount = challenges.filter(c => c.completed).length;
  const totalXP = challenges.filter(c => c.completed).reduce((s, c) => s + c.xp_reward, 0);

  return (
    <>
      <Helmet><title>Weekly Challenges - ExamPrep</title></Helmet>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Weekly Challenges</h1>
          <p className="mt-1 text-sm text-gray-500">Complete challenges to earn bonus XP</p>
        </div>

        {/* Progress overview */}
        <div className="card bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/10 dark:to-purple-900/10">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary-600">{completedCount}/{challenges.length}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">+{totalXP}</p>
              <p className="text-xs text-gray-500">XP Earned</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{stats?.active_days || 0}</p>
              <p className="text-xs text-gray-500">Days Active</p>
            </div>
          </div>
        </div>

        {/* This week stats */}
        {stats && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card text-center"><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.questions_this_week}</p><p className="text-xs text-gray-500">Questions</p></div>
            <div className="card text-center"><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.accuracy_this_week}%</p><p className="text-xs text-gray-500">Accuracy</p></div>
            <div className="card text-center"><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.active_days}</p><p className="text-xs text-gray-500">Active Days</p></div>
          </div>
        )}

        {/* Challenges */}
        <div className="space-y-3">
          {challenges.map(c => {
            const pct = c.type === 'accuracy' ? (c.progress >= c.target ? 100 : (c.progress / c.target) * 100) : Math.min(100, (c.progress / c.target) * 100);
            return (
              <div key={c.id} className={`card border-l-4 ${c.completed ? 'border-l-green-500' : 'border-l-primary-500'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{c.title}</h3>
                      {c.completed && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">Done!</span>}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{c.description}</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div className={`h-full rounded-full transition-all ${c.completed ? 'bg-green-500' : 'bg-primary-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {c.type === 'accuracy' ? `${c.progress}% / ${c.target}%` : `${c.progress} / ${c.target}`}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className={`text-lg font-bold ${c.completed ? 'text-green-600' : 'text-gray-400'}`}>+{c.xp_reward}</p>
                    <p className="text-[10px] text-gray-400">XP</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link to="/practice" className="btn-primary inline-block">Practice Now to Complete Challenges</Link>
        </div>
      </div>
    </>
  );
}
