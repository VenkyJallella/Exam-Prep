import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { testsAPI, type TestAttemptResult } from '@/lib/api/tests';
import toast from 'react-hot-toast';

export default function TestResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [result, setResult] = useState<TestAttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    const stateData = (location.state as any)?.resultData;
    if (stateData) {
      setResult(stateData);
      setLoading(false);
    } else if (attemptId) {
      testsAPI.getResults(attemptId)
        .then((res) => setResult(res.data.data))
        .catch(() => { toast.error('Failed to load results'); navigate('/tests'); })
        .finally(() => setLoading(false));
    }
  }, [attemptId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (!result) return null;

  const { attempt, answers } = result;
  const correctCount = answers.filter((a) => a.is_correct === true).length;
  const wrongCount = answers.filter((a) => a.is_correct === false).length;
  const skippedCount = answers.filter((a) => a.is_correct === null).length;

  return (
    <>
      <Helmet><title>Test Results - ExamPrep</title></Helmet>

      <div className="mx-auto max-w-3xl space-y-6">
        {/* Score header */}
        <div className="text-center">
          <div className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold text-white ${
            attempt.accuracy_pct >= 70 ? 'bg-green-500' : attempt.accuracy_pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
          }`}>
            {attempt.accuracy_pct}%
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Test Complete!</h1>
          <p className="mt-1 text-gray-500">
            {attempt.auto_submitted ? 'Auto-submitted (time expired)' : 'Here\'s your performance'}
          </p>
        </div>

        {/* Score cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card text-center">
            <p className="text-2xl font-bold text-primary-600">{attempt.total_score}</p>
            <p className="text-xs text-gray-500">Score / {attempt.max_score}</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-green-600">{correctCount}</p>
            <p className="text-xs text-gray-500">Correct</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-red-600">{wrongCount}</p>
            <p className="text-xs text-gray-500">Wrong</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-gray-400">{skippedCount}</p>
            <p className="text-xs text-gray-500">Skipped</p>
          </div>
        </div>

        {/* Details */}
        <div className="card space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Time Taken</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {Math.floor(attempt.time_taken_seconds / 60)}m {attempt.time_taken_seconds % 60}s
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Accuracy</span>
            <span className="font-medium text-gray-900 dark:text-white">{attempt.accuracy_pct}%</span>
          </div>
          {attempt.section_scores && Object.keys(attempt.section_scores).length > 0 && (
            <>
              <hr className="dark:border-gray-700" />
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Section-wise</p>
              {Object.entries(attempt.section_scores).map(([section, scores]: [string, any]) => (
                <div key={section} className="flex justify-between text-sm">
                  <span className="text-gray-500">{section}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {scores.marks}/{scores.total} ({scores.correct} correct, {scores.wrong} wrong)
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => navigate('/tests')} className="btn-secondary flex-1">
            Back to Tests
          </button>
          <button onClick={() => setShowAnswers(!showAnswers)} className="btn-primary flex-1">
            {showAnswers ? 'Hide Answers' : 'Review Answers'}
          </button>
        </div>

        {/* Answer review */}
        {showAnswers && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Answer Review</h2>
            {answers.map((ans, i) => (
              <div
                key={ans.question_id}
                className={`card border-l-4 ${
                  ans.is_correct === true
                    ? 'border-l-green-500'
                    : ans.is_correct === false
                      ? 'border-l-red-500'
                      : 'border-l-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-medium text-gray-400">Q{i + 1}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    ans.is_correct === true
                      ? 'bg-green-100 text-green-700'
                      : ans.is_correct === false
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-500'
                  }`}>
                    {ans.is_correct === true ? `+${ans.marks_awarded}` : ans.is_correct === false ? `${ans.marks_awarded}` : 'Skipped'}
                  </span>
                </div>

                <div className="mt-2 text-sm text-gray-500">
                  <span>Your answer: </span>
                  <span className={`font-medium ${ans.is_correct ? 'text-green-600' : 'text-red-600'}`}>
                    {ans.selected_answer?.join(', ') || 'Not answered'}
                  </span>
                  {!ans.is_correct && (
                    <>
                      <span> · Correct: </span>
                      <span className="font-medium text-green-600">{ans.correct_answer.join(', ')}</span>
                    </>
                  )}
                </div>

                {ans.explanation && (
                  <p className="mt-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                    {ans.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
