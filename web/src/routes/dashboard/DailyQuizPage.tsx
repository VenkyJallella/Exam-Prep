import { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import apiClient from '@/lib/api/client';
import toast from 'react-hot-toast';

interface QuizQuestion { id: string; question_text: string; options: Record<string, string>; difficulty: number; }
interface LeaderEntry { rank: number; display_name: string; score: number; total_marks: number; time_taken_seconds: number; }
interface AttemptAnswer { selected: string[]; is_correct: boolean; correct_answer?: string[]; explanation?: string; }

export default function DailyQuizPage() {
  const [loading, setLoading] = useState(true);
  const [quizId, setQuizId] = useState('');
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [reviewAnswers, setReviewAnswers] = useState<Record<string, AttemptAnswer>>({});
  const [showReview, setShowReview] = useState(false);
  const [alreadyAttempted, setAlreadyAttempted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();
  const startTime = useRef(Date.now());
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    apiClient.get('/quiz/today').then(res => {
      const data = res.data.data;
      if (!data) return;
      setQuizId(data.id);
      setTitle(data.title);
      setDurationMinutes(data.duration_minutes);

      if (data.already_attempted) {
        setAlreadyAttempted(true);
        setSubmitted(true);
        setResult(data.attempt);
        setReviewAnswers(data.attempt.answers || {});
        setLeaderboard(data.leaderboard || []);
        if (data.questions) setQuestions(data.questions);
      } else {
        setQuestions(data.questions || []);
        setTimeLeft(data.duration_minutes * 60);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (timeLeft <= 0 || submitted || !questions.length) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          if (!autoSubmittedRef.current) { autoSubmittedRef.current = true; handleSubmit(true); }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [questions, submitted]);

  const handleSelect = (qid: string, option: string) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qid]: [option] }));
  };

  const handleSubmit = useCallback(async (auto = false) => {
    if (submitting || submitted) return;
    setSubmitting(true);
    clearInterval(timerRef.current);
    try {
      const res = await apiClient.post('/quiz/today/submit', {
        answers, time_taken_seconds: Math.floor((Date.now() - startTime.current) / 1000),
      });
      setResult(res.data.data);
      setReviewAnswers(res.data.data.answers || {});
      setLeaderboard(res.data.data.leaderboard || []);
      setSubmitted(true);
      if (auto) toast('Time up! Quiz auto-submitted.', { icon: '\u23F0' });
      else toast.success('Quiz submitted!');
    } catch (e: any) {
      if (e?.response?.data?.error?.code === 'QUIZ_ALREADY_ATTEMPTED') {
        toast.error("Already attempted today's quiz");
        setSubmitted(true);
      } else toast.error('Failed to submit');
    } finally { setSubmitting(false); }
  }, [answers, submitting, submitted]);

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const answeredCount = Object.values(answers).filter(a => a.length > 0).length;

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" /></div>;

  if (!quizId) return (
    <div className="py-16 text-center">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">No Quiz Today</h2>
      <p className="mt-2 text-gray-500">Check back tomorrow for a new daily quiz!</p>
    </div>
  );

  // Results view
  if (submitted && result) {
    const accuracy = result.total_marks > 0 ? Math.round((result.correct_count / result.total_marks) * 100) : 0;
    return (
      <>
        <Helmet><title>Quiz Results - ExamPrep</title></Helmet>
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            {alreadyAttempted && <p className="mt-1 text-sm text-yellow-600">You already attempted today's quiz</p>}
          </div>

          <div className="card bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/10 dark:to-purple-900/10">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white ${accuracy >= 70 ? 'bg-green-500' : accuracy >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}>{accuracy}%</div>
                <p className="mt-1 text-xs text-gray-500">Accuracy</p>
              </div>
              <div><p className="text-3xl font-bold text-green-600">{result.correct_count}</p><p className="text-xs text-gray-500">Correct</p></div>
              <div><p className="text-3xl font-bold text-red-600">{result.wrong_count}</p><p className="text-xs text-gray-500">Wrong</p></div>
              <div><p className="text-3xl font-bold text-gray-700 dark:text-gray-300">{fmt(result.time_taken_seconds)}</p><p className="text-xs text-gray-500">Time</p></div>
            </div>
          </div>

          <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            <button onClick={() => setShowReview(false)} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium ${!showReview ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white' : 'text-gray-500'}`}>Leaderboard</button>
            <button onClick={() => setShowReview(true)} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium ${showReview ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white' : 'text-gray-500'}`}>Review Answers</button>
          </div>

          {!showReview && leaderboard.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <tr><th className="px-4 py-3 font-medium text-gray-500">Rank</th><th className="px-4 py-3 font-medium text-gray-500">Name</th><th className="px-4 py-3 font-medium text-gray-500">Score</th><th className="px-4 py-3 font-medium text-gray-500">Time</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {leaderboard.map(e => (
                    <tr key={e.rank}>
                      <td className="px-4 py-3">{e.rank <= 3 ? <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${e.rank === 1 ? 'bg-yellow-500' : e.rank === 2 ? 'bg-gray-400' : 'bg-orange-400'}`}>{e.rank}</span> : <span className="pl-2 text-gray-500">{e.rank}</span>}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{e.display_name}</td>
                      <td className="px-4 py-3 font-semibold text-primary-600">{e.score}/{e.total_marks}</td>
                      <td className="px-4 py-3 text-gray-500">{fmt(e.time_taken_seconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showReview && questions.length > 0 && (
            <div className="space-y-3">
              {questions.map((q, i) => {
                const ans = reviewAnswers[q.id];
                return (
                  <div key={q.id} className={`card border-l-4 ${ans?.is_correct ? 'border-l-green-500' : 'border-l-red-500'}`}>
                    <p className="text-xs text-gray-400 mb-1">Q{i + 1} {'★'.repeat(q.difficulty)}</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{q.question_text}</p>
                    <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      {Object.entries(q.options).map(([key, val]) => {
                        const isCorrect = ans?.correct_answer?.includes(key);
                        const wasSelected = ans?.selected?.includes(key);
                        return (
                          <div key={key} className={`rounded-lg border px-3 py-2 text-xs ${isCorrect ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : wasSelected ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                            <span className="font-bold mr-1">{key}.</span>{val}
                            {isCorrect && <span className="ml-1 text-green-600 font-semibold">✓</span>}
                            {wasSelected && !isCorrect && <span className="ml-1 text-red-600 font-semibold">✗</span>}
                          </div>
                        );
                      })}
                    </div>
                    {ans?.explanation && <p className="mt-2 text-xs text-blue-700 bg-blue-50 rounded p-2 dark:bg-blue-900/20 dark:text-blue-300">{ans.explanation}</p>}
                  </div>
                );
              })}
            </div>
          )}

          {showReview && questions.length === 0 && <div className="card text-center py-8 text-gray-500">Review available on same day of attempt.</div>}
        </div>
      </>
    );
  }

  // Quiz taking view
  const q = questions[currentQ];

  return (
    <>
      <Helmet><title>Daily Quiz - ExamPrep</title></Helmet>
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{answeredCount}/{questions.length}</span>
            <span className={`rounded-full px-3 py-1 font-mono text-sm font-bold ${timeLeft <= 60 ? 'bg-red-100 text-red-600 animate-pulse dark:bg-red-900/30' : timeLeft <= 300 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>{fmt(timeLeft)}</span>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {questions.map((_, i) => (
            <button key={i} onClick={() => setCurrentQ(i)} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all ${i === currentQ ? 'ring-2 ring-primary-500' : ''} ${answers[questions[i].id]?.length ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>{i + 1}</button>
          ))}
        </div>

        {q && (
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Question {currentQ + 1} of {questions.length}</p>
              <span className="text-xs text-gray-400">{'★'.repeat(q.difficulty)}{'☆'.repeat(5 - q.difficulty)}</span>
            </div>
            <p className="text-lg leading-relaxed text-gray-900 dark:text-white">{q.question_text}</p>
            <div className="space-y-2">
              {Object.entries(q.options).map(([key, val]) => {
                const selected = answers[q.id]?.includes(key);
                return (
                  <button key={key} onClick={() => handleSelect(q.id, key)} className={`flex w-full items-start gap-3 rounded-xl border-2 p-3.5 text-left transition-all ${selected ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}`}>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${selected ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>{key}</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200">{val}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-2">
              <button onClick={() => setCurrentQ(i => Math.max(0, i - 1))} disabled={currentQ === 0} className="btn-secondary text-sm disabled:opacity-40">Previous</button>
              {currentQ === questions.length - 1 ? (
                <button onClick={() => handleSubmit(false)} disabled={submitting} className="rounded-lg bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                  {submitting ? 'Submitting...' : `Submit Quiz (${answeredCount}/${questions.length})`}
                </button>
              ) : (
                <button onClick={() => setCurrentQ(i => i + 1)} className="btn-primary text-sm">Next</button>
              )}
            </div>
          </div>
        )}

        {questions.length - answeredCount > 0 && currentQ === questions.length - 1 && (
          <p className="text-center text-xs text-red-500">{questions.length - answeredCount} question{questions.length - answeredCount > 1 ? 's' : ''} unanswered</p>
        )}
      </div>
    </>
  );
}
