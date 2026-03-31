import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { practiceAPI, type SessionResult } from '@/lib/api/practice';
import { usePracticeStore } from '@/lib/store/practiceStore';
import { useTimer } from '@/hooks/useTimer';
import QuestionCard from '@/components/question/QuestionCard';
import toast from 'react-hot-toast';

export default function PracticeSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [result, setResult] = useState<SessionResult | null>(null);

  const { session, questions, currentIndex, answers, setSession, setAnswer, nextQuestion, prevQuestion, reset } = usePracticeStore();
  const timer = useTimer(0, false);

  // Reset store on unmount only
  useEffect(() => {
    return () => { reset(); };
  }, []);

  // Load session
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    setLoading(true);
    practiceAPI.getSession(sessionId)
      .then((res) => {
        if (cancelled) return;
        setSession(res.data.data.session, res.data.data.questions);
        // Restore timer from localStorage or start fresh
        const timerKey = `examprep_practice_start_${sessionId}`;
        let startTime = localStorage.getItem(timerKey);
        if (!startTime) {
          startTime = String(Date.now());
          localStorage.setItem(timerKey, startTime);
        }
        const elapsed = Math.floor((Date.now() - Number(startTime)) / 1000);
        timer.reset(elapsed);
        timer.start();
      })
      .catch(() => {
        if (cancelled) return;
        toast.error('Failed to load session');
        navigate('/practice');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [sessionId]);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

  const handleSubmitAnswer = async (selected: string[]) => {
    if (!sessionId || !currentQuestion) return;
    setSubmittingAnswer(true);
    try {
      const res = await practiceAPI.submitAnswer(sessionId, {
        question_id: currentQuestion.id,
        selected_answer: selected,
        time_taken_seconds: Math.floor((Date.now() - (usePracticeStore.getState().startTime || Date.now())) / 1000),
      });
      setAnswer(currentQuestion.id, selected, res.data.data, 0);
    } catch {
      toast.error('Failed to submit answer');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleNext = () => {
    if (currentIndex === questions.length - 1) {
      handleFinish();
    } else {
      nextQuestion();
    }
  };

  const handleFinish = async () => {
    if (!sessionId) return;
    timer.pause();
    try {
      const res = await practiceAPI.completeSession(sessionId);
      setResult(res.data.data);
    } catch {
      toast.error('Failed to complete session');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  // Results screen
  if (result) {
    return (
      <>
        <Helmet>
          <title>Practice Results - ExamPrep</title>
          <meta name="description" content="View your practice session results with accuracy breakdown and performance summary." />
        </Helmet>
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="text-center">
            <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold text-white ${
              result.accuracy_pct >= 70 ? 'bg-green-500' : result.accuracy_pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
            }`}>
              {result.accuracy_pct}%
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Session Complete!</h1>
            <p className="mt-1 text-gray-500">Here's how you performed</p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="card text-center">
              <p className="text-2xl font-bold text-green-600">{result.correct}</p>
              <p className="text-xs text-gray-500">Correct</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-red-600">{result.wrong}</p>
              <p className="text-xs text-gray-500">Wrong</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-gray-400">{result.skipped}</p>
              <p className="text-xs text-gray-500">Skipped</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-primary-600">+{result.xp_earned}</p>
              <p className="text-xs text-gray-500">XP Earned</p>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Total Questions</span>
              <span className="font-medium text-gray-900 dark:text-white">{result.total_questions}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-gray-500">Time Taken</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.floor(result.total_time_seconds / 60)}m {result.total_time_seconds % 60}s
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-gray-500">Accuracy</span>
              <span className="font-medium text-gray-900 dark:text-white">{result.accuracy_pct}%</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => navigate('/practice')} className="btn-secondary flex-1">
              Practice More
            </button>
            <button onClick={() => {
              const text = `I scored ${result.correct}/${result.total_questions} (${result.accuracy_pct}%) on ExamPrep practice! Can you beat me? 🎯`;
              if (navigator.share) {
                navigator.share({ title: 'My ExamPrep Score', text }).catch(() => {});
              } else {
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
              }
            }} className="btn-secondary flex-1">
              Share Score
            </button>
            <button onClick={() => navigate('/mistakes')} className="btn-primary flex-1">
              Review Mistakes
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!currentQuestion) {
    return <div className="text-center text-gray-500">No questions found for this session.</div>;
  }

  return (
    <>
      <Helmet>
        <title>{`Practice - Q${currentIndex + 1} - ExamPrep`}</title>
        <meta name="description" content="Practice session in progress. Answer questions to improve your exam preparation." />
      </Helmet>

      {/* Timer bar */}
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {Object.keys(answers).length} / {questions.length} answered
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-mono font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {timer.formatted}
        </span>
        <button onClick={handleFinish} className="text-sm font-medium text-red-600 hover:text-red-700">
          End Session
        </button>
      </div>

      <QuestionCard
        questionNumber={currentIndex + 1}
        totalQuestions={questions.length}
        questionText={currentQuestion.question_text}
        options={currentQuestion.options}
        selectedAnswer={currentAnswer?.selected || null}
        result={currentAnswer?.result || null}
        onSubmitAnswer={handleSubmitAnswer}
        onNext={handleNext}
        onPrev={prevQuestion}
        isFirst={currentIndex === 0}
        isLast={currentIndex === questions.length - 1}
        isSubmitting={submittingAnswer}
      />
    </>
  );
}
