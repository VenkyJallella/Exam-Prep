import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { testsAPI, type Test, type TestAttempt } from '@/lib/api/tests';
import toast from 'react-hot-toast';

export default function TestListPage() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<Test[]>([]);
  const [history, setHistory] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [tab, setTab] = useState<'available' | 'history'>('available');

  useEffect(() => {
    Promise.all([
      testsAPI.list().then((r) => setTests(r.data.data)),
      testsAPI.getHistory().then((r) => setHistory(r.data.data)),
    ])
      .catch(() => toast.error('Failed to load tests'))
      .finally(() => setLoading(false));
  }, []);

  const handleStart = async (testId: string) => {
    setStarting(testId);
    try {
      const res = await testsAPI.startAttempt(testId);
      navigate(`/tests/${res.data.data.attempt.id}`, {
        state: { attemptData: res.data.data },
      });
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to start test';
      toast.error(msg);
    } finally {
      setStarting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Mock Tests - ExamPrep</title>
        <meta name="description" content="Take full-length mock tests for UPSC, JEE, SSC, and Banking exams. Timed tests with detailed results." />
      </Helmet>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mock Tests</h1>
          <p className="mt-1 text-sm text-gray-500">
            Take full-length timed tests to simulate the real exam experience.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          <button
            onClick={() => setTab('available')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              tab === 'available'
                ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Available Tests ({tests.length})
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              tab === 'history'
                ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            My Attempts ({history.length})
          </button>
        </div>

        {/* Available Tests */}
        {tab === 'available' && (
          <div className="space-y-4">
            {tests.length === 0 ? (
              <div className="card py-12 text-center">
                <p className="text-lg font-medium text-gray-400">No tests available yet</p>
                <p className="mt-1 text-sm text-gray-400">Check back soon!</p>
              </div>
            ) : (
              tests.map((test) => (
                <div key={test.id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {test.title}
                        </h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          test.test_type === 'mock'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            : test.test_type === 'sectional'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {test.test_type}
                        </span>
                      </div>
                      {test.description && (
                        <p className="mt-1 text-sm text-gray-500">{test.description}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {test.duration_minutes} min
                        </span>
                        <span>{test.total_marks} marks</span>
                        {test.negative_marking_pct > 0 && (
                          <span className="text-red-500">-{test.negative_marking_pct}% negative</span>
                        )}
                      </div>
                    </div>
                    {(() => {
                      const attempt = history.find(a => a.test_id === test.id);
                      if (attempt && attempt.status !== 'in_progress') {
                        return (
                          <div className="ml-4 flex flex-col items-end gap-1">
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Attempted</span>
                            <button onClick={() => navigate(`/tests/${attempt.id}/results`)} className="btn-secondary text-xs whitespace-nowrap">View Results</button>
                          </div>
                        );
                      }
                      return (
                        <button onClick={() => handleStart(test.id)} disabled={starting === test.id} className="btn-primary ml-4 whitespace-nowrap">
                          {starting === test.id ? 'Starting...' : attempt?.status === 'in_progress' ? 'Resume' : 'Start Test'}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* History */}
        {tab === 'history' && (
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="card py-12 text-center">
                <p className="text-lg font-medium text-gray-400">No attempts yet</p>
                <p className="mt-1 text-sm text-gray-400">Take your first test to see results here</p>
              </div>
            ) : (
              history.map((attempt) => (
                <div key={attempt.id} className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          attempt.status === 'submitted'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : attempt.status === 'in_progress'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-gray-100 text-gray-600'
                        }`}>
                          {attempt.status === 'submitted' ? 'Completed' : attempt.status === 'in_progress' ? 'In Progress' : 'Expired'}
                        </span>
                        {attempt.auto_submitted && (
                          <span className="text-xs text-orange-500">Auto-submitted</span>
                        )}
                      </div>
                      <div className="mt-2 flex gap-6 text-sm">
                        <span className="text-gray-500">
                          Score: <span className="font-semibold text-gray-900 dark:text-white">{attempt.total_score}/{attempt.max_score}</span>
                        </span>
                        <span className="text-gray-500">
                          Accuracy: <span className="font-semibold text-gray-900 dark:text-white">{attempt.accuracy_pct}%</span>
                        </span>
                        <span className="text-gray-500">
                          Time: <span className="font-medium">{Math.floor(attempt.time_taken_seconds / 60)}m</span>
                        </span>
                      </div>
                    </div>
                    {attempt.status === 'submitted' ? (
                      <button
                        onClick={() => navigate(`/tests/${attempt.id}/results`)}
                        className="btn-secondary text-sm"
                      >
                        View Results
                      </button>
                    ) : attempt.status === 'in_progress' ? (
                      <button
                        onClick={() => navigate(`/tests/${attempt.id}`)}
                        className="btn-primary text-sm"
                      >
                        Resume
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
