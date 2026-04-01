import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../../lib/api/client';

interface Question {
  id: string;
  question_text: string;
  options: Record<string, string>;
  correct_answer: string[];
  explanation: string | null;
  difficulty: number;
}

export default function TryFreePage() {
  const { slug } = useParams<{ slug: string }>();
  const [examName, setExamName] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [finished, setFinished] = useState(false);
  const [alreadyTried, setAlreadyTried] = useState(false);

  useEffect(() => {
    if (!slug) return;

    // Check if already attempted
    const triedKey = `examprep_tried_${slug}`;
    if (localStorage.getItem(triedKey)) {
      setAlreadyTried(true);
      setLoading(false);
      return;
    }

    if (slug === 'coding') {
      setExamName('Coding & Placements');
      setLoading(false);
      return;
    }
    apiClient.get(`/exams/try-free/${slug}`)
      .then(res => {
        setExamName(res.data.data.exam);
        setQuestions(res.data.data.questions);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const current = questions[currentIndex];

  const handleSelect = (key: string) => {
    if (answered) return;
    setSelected(key);
    setAnswered(true);
    setTotalAnswered(t => t + 1);
    if (current.correct_answer.includes(key)) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setFinished(true);
      // Mark as tried in localStorage
      if (slug) localStorage.setItem(`examprep_tried_${slug}`, 'true');
    }
  };

  if (alreadyTried) return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <Helmet><title>Try Free — Already Attempted | ExamPrep</title></Helmet>
      <div className="card">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-3xl">✅</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">You've Already Tried This!</h1>
        <p className="mt-3 text-gray-500">You've used your free trial for this exam. Sign up to unlock unlimited practice with AI-powered questions, mock tests, and more.</p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link to="/register" className="btn-primary px-8 py-3">Sign Up Free — Unlimited Access</Link>
          <Link to="/" className="text-sm font-medium text-primary-600 hover:underline">Explore other exams</Link>
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" /></div>;

  if (slug === 'coding' || questions.length === 0) return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <Helmet><title>{slug === 'coding' ? 'Coding Practice' : examName} - Try Free | ExamPrep</title></Helmet>
      {slug === 'coding' ? (
        <>
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-100 text-4xl">💻</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Coding Practice</h1>
          <p className="mt-3 text-gray-500">Our coding practice uses an in-browser code editor with real test case execution — just like LeetCode.</p>
          <p className="mt-2 text-gray-500">Sign up free to access 30+ coding problems across Arrays, DP, Trees, Graphs, and more.</p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/register" className="btn-primary px-8 py-3">Sign Up Free — Start Coding</Link>
            <Link to="/exams/coding" className="text-sm font-medium text-primary-600 hover:underline">Learn more →</Link>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">No Questions Available</h1>
          <p className="mt-2 text-gray-500">Questions for this exam are being generated. Check back soon!</p>
          <Link to="/" className="btn-primary mt-6 inline-block px-6 py-3">Back to Home</Link>
        </>
      )}
    </div>
  );

  if (finished) return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <Helmet><title>Results - Try {examName} Free | ExamPrep</title></Helmet>
      <div className="card">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-primary-500 to-accent-500">
          <span className="text-3xl font-bold text-white">{score}/{totalAnswered}</span>
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
          {score === totalAnswered ? 'Perfect Score!' : score >= totalAnswered * 0.6 ? 'Good Job!' : 'Keep Practicing!'}
        </h1>
        <p className="mt-2 text-gray-500">
          You scored {score} out of {totalAnswered} on {examName} questions.
        </p>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Sign up free to unlock unlimited practice, AI-powered questions, mock tests, daily quizzes, and performance analytics.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link to="/register" className="btn-primary px-8 py-3 text-base">
            Sign Up Free — Unlock Full Access
          </Link>
          <Link to={`/exams/${slug}`} className="text-sm font-medium text-primary-600 hover:underline">
            Learn more about {examName}
          </Link>
        </div>
      </div>
    </div>
  );

  const isCorrect = selected && current.correct_answer.includes(selected);

  return (
    <>
      <Helmet>
        <title>Try {examName} Free — 5 Questions | ExamPrep</title>
        <meta name="description" content={`Try ${examName} exam questions for free. No signup required. Practice 5 questions and see how you score.`} />
      </Helmet>
      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link to="/" className="text-sm text-primary-600 hover:underline">&larr; Back</Link>
            <h1 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">Try {examName} — Free</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-full bg-primary-100 px-3 py-1 font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
              {currentIndex + 1}/{questions.length}
            </span>
            <span className="font-medium text-green-600">{score} correct</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 rounded-full bg-gray-200 dark:bg-gray-800">
          <div className="h-full rounded-full bg-primary-600 transition-all" style={{ width: `${((currentIndex + (answered ? 1 : 0)) / questions.length) * 100}%` }} />
        </div>

        {/* Question */}
        <div className="mt-6 card">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Question {currentIndex + 1}</span>
            <span>·</span>
            <span>Difficulty: {'★'.repeat(current.difficulty)}{'☆'.repeat(5 - current.difficulty)}</span>
          </div>
          <p className="mt-3 text-base font-medium leading-relaxed text-gray-900 dark:text-white">{current.question_text}</p>

          {/* Options */}
          <div className="mt-5 space-y-3">
            {['A', 'B', 'C', 'D'].filter(k => k in current.options).map(key => {
              let style = 'border-gray-200 hover:border-primary-300 hover:bg-primary-50 dark:border-gray-700 dark:hover:border-primary-700';
              if (answered) {
                if (current.correct_answer.includes(key)) {
                  style = 'border-green-500 bg-green-50 dark:bg-green-900/20';
                } else if (key === selected && !isCorrect) {
                  style = 'border-red-500 bg-red-50 dark:bg-red-900/20';
                } else {
                  style = 'border-gray-200 opacity-50 dark:border-gray-700';
                }
              } else if (key === selected) {
                style = 'border-primary-500 bg-primary-50 dark:bg-primary-900/20';
              }

              return (
                <button key={key} onClick={() => handleSelect(key)} disabled={answered}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${style}`}>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                    answered && current.correct_answer.includes(key) ? 'bg-green-600 text-white' :
                    answered && key === selected && !isCorrect ? 'bg-red-600 text-white' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>{key}</span>
                  <span className="text-sm text-gray-800 dark:text-gray-200">{current.options[key]}</span>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {answered && current.explanation && (
            <div className={`mt-4 rounded-xl border p-4 ${isCorrect ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10'}`}>
              <p className={`text-sm font-medium ${isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {isCorrect ? 'Correct!' : `Wrong — Correct answer: ${current.correct_answer.join(', ')}`}
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{current.explanation}</p>
            </div>
          )}

          {/* Next button */}
          {answered && (
            <button onClick={handleNext} className="btn-primary mt-5 w-full py-3">
              {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
            </button>
          )}
        </div>

        {/* Signup nudge */}
        <div className="mt-6 rounded-xl bg-gradient-to-r from-primary-50 to-accent-50 p-4 text-center dark:from-primary-900/10 dark:to-accent-900/10">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Want unlimited questions, mock tests, and AI-powered analytics?
          </p>
          <Link to="/register" className="mt-2 inline-block text-sm font-semibold text-primary-600 hover:underline">
            Sign up free →
          </Link>
        </div>
      </div>
    </>
  );
}
