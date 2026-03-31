import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { testsAPI } from '@/lib/api/tests';
import { useTestStore } from '@/lib/store/testStore';
import { useTimer } from '@/hooks/useTimer';
import toast from 'react-hot-toast';

export default function TestSessionPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const autoSubmittedRef = useRef(false);

  const {
    questions, currentIndex, answers,
    negativeMarkingPct,
    setAttempt, setAnswer, toggleReview, goToQuestion, nextQuestion, prevQuestion, reset,
  } = useTestStore();

  const timer = useTimer(0, true); // countdown

  // Reset store on unmount only
  useEffect(() => {
    return () => { reset(); };
  }, []);

  // Load attempt data
  useEffect(() => {
    if (!attemptId) return;
    let cancelled = false;

    const stateData = (location.state as any)?.attemptData;
    if (stateData) {
      setAttempt(
        stateData.attempt,
        stateData.questions,
        stateData.duration_minutes,
        stateData.negative_marking_pct,
        stateData.instructions,
      );
      timer.reset(stateData.duration_minutes * 60);
      timer.start();
      setLoading(false);
    } else {
      // Resume: find this attempt in history to get test_id, then call startAttempt
      testsAPI.getHistory()
        .then((res) => {
          if (cancelled) return;
          const attempt = res.data.data.find((a) => a.id === attemptId);
          if (!attempt) {
            toast.error('Test session not found');
            navigate('/tests');
            return;
          }
          if (attempt.status !== 'in_progress') {
            navigate(`/tests/${attemptId}/results`, { replace: true });
            return;
          }
          return testsAPI.startAttempt(attempt.test_id).then((startRes) => {
            if (cancelled) return;
            const data = startRes.data.data;
            setAttempt(
              data.attempt,
              data.questions,
              data.duration_minutes,
              data.negative_marking_pct,
              data.instructions,
            );
            // Calculate remaining time from when attempt started
            const startedAt = new Date(data.attempt.created_at).getTime();
            const deadlineMs = startedAt + data.duration_minutes * 60 * 1000;
            const remainingSec = Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
            if (remainingSec <= 0) {
              // Time already expired — auto submit
              toast.error('Test time has expired');
              navigate(`/tests/${attemptId}/results`, { replace: true });
              return;
            }
            timer.reset(remainingSec);
            timer.start();
            setLoading(false);
          });
        })
        .catch(() => {
          if (cancelled) return;
          toast.error('Failed to load test session');
          navigate('/tests');
        });
    }

    return () => { cancelled = true; };
  }, [attemptId]);

  // Auto-submit when timer expires
  useEffect(() => {
    if (timer.isExpired && !autoSubmittedRef.current && attemptId) {
      autoSubmittedRef.current = true;
      handleSubmitTest(true);
    }
  }, [timer.isExpired]);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.question_id] : undefined;

  // Sync offline answers queue
  useEffect(() => {
    if (!attemptId) return;
    const key = `examprep_pending_answers_${attemptId}`;
    const pending = JSON.parse(localStorage.getItem(key) || '[]');
    if (pending.length > 0) {
      Promise.allSettled(
        pending.map((ans: any) => testsAPI.submitAnswer(attemptId, ans))
      ).then(() => localStorage.removeItem(key));
    }
  }, [attemptId]);

  const handleOptionSelect = (key: string) => {
    if (!currentQuestion) return;
    setAnswer(currentQuestion.question_id, [key]);

    const answerData = {
      question_id: currentQuestion.question_id,
      selected_answer: [key],
      time_taken_seconds: 0,
    };

    // Save to backend, fallback to localStorage if offline
    if (attemptId) {
      testsAPI.submitAnswer(attemptId, answerData).catch(() => {
        // Offline — queue in localStorage
        const key = `examprep_pending_answers_${attemptId}`;
        const pending = JSON.parse(localStorage.getItem(key) || '[]');
        const idx = pending.findIndex((a: any) => a.question_id === answerData.question_id);
        if (idx >= 0) pending[idx] = answerData; else pending.push(answerData);
        localStorage.setItem(key, JSON.stringify(pending));
      });
    }
  };

  const handleClearAnswer = () => {
    if (!currentQuestion) return;
    setAnswer(currentQuestion.question_id, []);
  };

  const handleSubmitTest = useCallback(async (auto = false) => {
    if (!attemptId || submitting) return;
    setSubmitting(true);
    timer.pause();
    try {
      const res = await testsAPI.submitTest(attemptId);
      navigate(`/tests/${attemptId}/results`, {
        state: { resultData: res.data.data },
        replace: true,
      });
      if (auto) toast('Time up! Test auto-submitted.', { icon: '⏰' });
    } catch {
      toast.error('Failed to submit test');
      setSubmitting(false);
    }
  }, [attemptId, submitting, timer]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (!currentQuestion) {
    return <div className="text-center text-gray-500">No questions found.</div>;
  }

  const answeredCount = Object.values(answers).filter((a) => a.selected.length > 0).length;
  const reviewCount = Object.values(answers).filter((a) => a.markedForReview).length;

  return (
    <>
      <Helmet>
        <title>Test in Progress - ExamPrep</title>
        <meta name="description" content="Mock test in progress. Answer questions within the time limit to simulate real exam conditions." />
      </Helmet>

      {/* Full-screen test layout */}
      <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-500">
              Q {currentIndex + 1}/{questions.length}
            </span>
            <span className="text-xs text-gray-400">
              {answeredCount} answered · {reviewCount} marked
            </span>
          </div>

          {/* Timer */}
          <div className={`rounded-lg px-4 py-1.5 font-mono text-lg font-bold ${
            timer.seconds <= 300
              ? 'animate-pulse bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
              : timer.seconds <= 600
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
          }`}>
            {timer.formatted}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPalette(!showPalette)}
              className="btn-secondary text-sm"
            >
              {showPalette ? 'Hide' : 'Questions'}
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Submit Test
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Question area */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-3xl space-y-6">
              {/* Question header */}
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  Question {currentIndex + 1}
                  {currentQuestion.marks > 1 && ` · ${currentQuestion.marks} marks`}
                  {currentQuestion.section && ` · ${currentQuestion.section}`}
                </span>
                <button
                  onClick={() => currentQuestion && toggleReview(currentQuestion.question_id)}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1 text-sm font-medium transition-all ${
                    currentAnswer?.markedForReview
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800'
                  }`}
                >
                  <svg className="h-4 w-4" fill={currentAnswer?.markedForReview ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  {currentAnswer?.markedForReview ? 'Marked' : 'Mark for Review'}
                </button>
              </div>

              {/* Question text */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/50">
                <p className="text-lg leading-relaxed text-gray-900 dark:text-white">
                  {currentQuestion.question_text}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {Object.entries(currentQuestion.options).map(([key, value]) => {
                  const isSelected = currentAnswer?.selected.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => handleOptionSelect(key)}
                      className={`flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                        isSelected
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {key}
                      </span>
                      <span className="flex-1 pt-1 text-sm text-gray-800 dark:text-gray-200">
                        {value}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={handleClearAnswer}
                  disabled={!currentAnswer?.selected.length}
                  className="text-sm font-medium text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  Clear Response
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={prevQuestion}
                    disabled={currentIndex === 0}
                    className="btn-secondary disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={nextQuestion}
                    disabled={currentIndex === questions.length - 1}
                    className="btn-primary"
                  >
                    {currentIndex === questions.length - 1 ? 'Last Question' : 'Next'}
                  </button>
                </div>
              </div>

              {negativeMarkingPct > 0 && (
                <p className="text-center text-xs text-red-400">
                  Negative marking: -{negativeMarkingPct}% for wrong answers
                </p>
              )}
            </div>
          </div>

          {/* Question palette sidebar */}
          {showPalette && (
            <div className="w-72 overflow-y-auto border-l border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Question Palette</h3>

              {/* Legend */}
              <div className="mb-4 flex flex-wrap gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-sm bg-green-500" /> Answered
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-sm bg-orange-500" /> Review
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-sm bg-gray-300" /> Unanswered
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, i) => {
                  const ans = answers[q.question_id];
                  const isAnswered = ans && ans.selected.length > 0;
                  const isReview = ans?.markedForReview;
                  const isCurrent = i === currentIndex;

                  let bg = 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
                  if (isAnswered && isReview) bg = 'bg-orange-500 text-white';
                  else if (isAnswered) bg = 'bg-green-500 text-white';
                  else if (isReview) bg = 'bg-orange-300 text-white';

                  return (
                    <button
                      key={q.id}
                      onClick={() => goToQuestion(i)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold transition-all ${bg} ${
                        isCurrent ? 'ring-2 ring-primary-500 ring-offset-1' : ''
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 space-y-2 text-sm text-gray-500">
                <div className="flex justify-between">
                  <span>Answered</span>
                  <span className="font-medium text-gray-900 dark:text-white">{answeredCount}/{questions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Marked for Review</span>
                  <span className="font-medium text-orange-600">{reviewCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Not Answered</span>
                  <span className="font-medium text-gray-400">{questions.length - answeredCount}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Submit Test?</h3>
            <p className="mt-2 text-sm text-gray-500">
              You have answered <strong>{answeredCount}</strong> out of <strong>{questions.length}</strong> questions.
              {questions.length - answeredCount > 0 && (
                <span className="text-red-500">
                  {' '}{questions.length - answeredCount} questions are unanswered.
                </span>
              )}
            </p>
            {reviewCount > 0 && (
              <p className="mt-1 text-sm text-orange-500">
                {reviewCount} questions are marked for review.
              </p>
            )}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="btn-secondary flex-1"
              >
                Go Back
              </button>
              <button
                onClick={() => { setShowConfirm(false); handleSubmitTest(); }}
                disabled={submitting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
