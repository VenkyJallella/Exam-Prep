import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import apiClient from '@/lib/api/client';
import toast from 'react-hot-toast';

interface QuizQuestion { id: string; question_text: string; options: Record<string, string>; difficulty: number; }
interface Quiz { id: string; title: string; quiz_date: string; total_questions: number; duration_minutes: number; questions: QuizQuestion[]; }
interface LeaderEntry { rank: number; display_name: string; score: number; total_marks: number; time_taken_seconds: number; }

export default function DailyQuizPage() {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>();
  const startTime = useRef(Date.now());

  useEffect(() => {
    apiClient.get('/quiz/today').then(res => {
      setQuiz(res.data.data);
      if (res.data.data) setTimeLeft(res.data.data.duration_minutes * 60);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (timeLeft <= 0 || submitted || !quiz) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [quiz, submitted]);

  const handleSelect = (qid: string, option: string) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qid]: [option] }));
  };

  const handleSubmit = async () => {
    if (!quiz || submitted) return;
    setSubmitted(true);
    clearInterval(timerRef.current);
    try {
      const res = await apiClient.post('/quiz/today/submit', {
        answers, time_taken_seconds: Math.floor((Date.now() - startTime.current) / 1000),
      });
      setResult(res.data.data);
      const lb = await apiClient.get('/quiz/today/leaderboard');
      setLeaderboard(lb.data.data);
    } catch (e: any) {
      if (e?.response?.data?.error?.code === 'QUIZ_ALREADY_ATTEMPTED') {
        toast.error('Already attempted today\'s quiz');
        setSubmitted(true);
      } else toast.error('Failed to submit');
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" /></div>;
  if (!quiz) return <div className="text-center py-16"><h2 className="text-xl font-bold text-gray-900 dark:text-white">No Quiz Today</h2><p className="mt-2 text-gray-500">Check back tomorrow!</p></div>;

  if (result) {
    return (
      <>
        <Helmet><title>Quiz Results - ExamPrep</title></Helmet>
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="text-center">
            <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold text-white ${result.correct_count >= result.total_marks * 0.7 ? 'bg-green-500' : result.correct_count >= result.total_marks * 0.4 ? 'bg-yellow-500' : 'bg-red-500'}`}>
              {result.score}/{result.total_marks}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quiz Complete!</h1>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="card text-center"><p className="text-2xl font-bold text-green-600">{result.correct_count}</p><p className="text-xs text-gray-500">Correct</p></div>
            <div className="card text-center"><p className="text-2xl font-bold text-red-600">{result.wrong_count}</p><p className="text-xs text-gray-500">Wrong</p></div>
            <div className="card text-center"><p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{fmt(result.time_taken_seconds)}</p><p className="text-xs text-gray-500">Time</p></div>
          </div>
          {leaderboard.length > 0 && (
            <div className="card">
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Today's Leaderboard</h2>
              <div className="space-y-2">{leaderboard.map(e => (
                <div key={e.rank} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${e.rank === 1 ? 'bg-yellow-500' : e.rank === 2 ? 'bg-gray-400' : e.rank === 3 ? 'bg-orange-400' : 'bg-gray-300'}`}>{e.rank}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{e.display_name}</span>
                  </div>
                  <span className="text-sm font-semibold text-primary-600">{e.score}/{e.total_marks}</span>
                </div>
              ))}</div>
            </div>
          )}
        </div>
      </>
    );
  }

  const q = quiz.questions[currentQ];

  return (
    <>
      <Helmet><title>Daily Quiz - ExamPrep</title></Helmet>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{quiz.title}</h1>
          <span className={`rounded-full px-3 py-1 font-mono text-sm font-bold ${timeLeft <= 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>{fmt(timeLeft)}</span>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-2">
          {quiz.questions.map((_, i) => (
            <button key={i} onClick={() => setCurrentQ(i)} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${i === currentQ ? 'ring-2 ring-primary-500' : ''} ${answers[quiz.questions[i].id] ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>{i + 1}</button>
          ))}
        </div>

        {q && (
          <div className="card space-y-4">
            <p className="text-sm text-gray-500">Question {currentQ + 1} of {quiz.total_questions}</p>
            <p className="text-lg text-gray-900 dark:text-white">{q.question_text}</p>
            <div className="space-y-2">
              {Object.entries(q.options).map(([key, val]) => {
                const selected = answers[q.id]?.includes(key);
                return (
                  <button key={key} onClick={() => handleSelect(q.id, key)} className={`flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left transition-all ${selected ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'}`}>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${selected ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>{key}</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200">{val}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => setCurrentQ(i => Math.max(0, i - 1))} disabled={currentQ === 0} className="btn-secondary text-sm disabled:opacity-40">Previous</button>
              {currentQ === quiz.questions.length - 1 ? (
                <button onClick={handleSubmit} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Submit Quiz</button>
              ) : (
                <button onClick={() => setCurrentQ(i => i + 1)} className="btn-primary text-sm">Next</button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
