import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import apiClient from '@/lib/api/client';
import toast from 'react-hot-toast';

interface Problem {
  id: string; title: string; slug: string; description: string; difficulty: string;
  constraints: string | null; input_format: string | null; output_format: string | null;
  sample_test_cases: Array<{ input: string; expected_output: string }>;
  starter_code: Record<string, string>; time_limit_ms: number; memory_limit_mb: number;
  tags: string[]; acceptance_rate: number;
}

interface SubmissionResult {
  id: string; status: string; passed_test_cases: number; total_test_cases: number;
  execution_time_ms: number | null; error_message: string | null;
  test_results: Array<{ passed: boolean; output: string; expected: string }>;
}

const LANGUAGES = ['python', 'javascript', 'java', 'cpp'];

export default function CodingProblemPage() {
  const { slug } = useParams<{ slug: string }>();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  useEffect(() => {
    if (!slug) return;
    apiClient.get(`/coding/${slug}`)
      .then(res => {
        const p = res.data.data;
        setProblem(p);
        setCode(p.starter_code?.python || p.starter_code?.[Object.keys(p.starter_code)[0]] || '# Write your solution here\n');
      })
      .catch(() => toast.error('Problem not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSubmit = async () => {
    if (!slug || !code.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await apiClient.post(`/coding/${slug}/submit`, { language, code });
      setResult(res.data.data);
      if (res.data.data.status === 'accepted') toast.success('All test cases passed!');
    } catch { toast.error('Submission failed'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" /></div>;
  if (!problem) return <div className="text-center text-gray-500">Problem not found. <Link to="/coding" className="text-primary-600 hover:underline">Back</Link></div>;

  const diffColor = problem.difficulty === 'easy' ? 'text-green-600' : problem.difficulty === 'hard' ? 'text-red-600' : 'text-yellow-600';

  return (
    <>
      <Helmet><title>{problem.title} - Coding | ExamPrep</title></Helmet>
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* Left: Problem description */}
        <div className="w-1/2 overflow-y-auto rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
          <Link to="/coding" className="text-sm text-primary-600 hover:underline">&larr; All Problems</Link>
          <h1 className="mt-3 text-xl font-bold text-gray-900 dark:text-white">{problem.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm">
            <span className={`font-medium capitalize ${diffColor}`}>{problem.difficulty}</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">{problem.acceptance_rate.toFixed(1)}% acceptance</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">{problem.time_limit_ms}ms / {problem.memory_limit_mb}MB</span>
          </div>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">{problem.description}</div>
          {problem.constraints && <div className="mt-4"><h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Constraints</h3><pre className="mt-1 text-xs text-gray-500">{problem.constraints}</pre></div>}
          {problem.sample_test_cases.length > 0 && (
            <div className="mt-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Examples</h3>
              {problem.sample_test_cases.map((tc, i) => (
                <div key={i} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                  <div className="text-xs"><span className="font-medium text-gray-500">Input:</span><pre className="mt-1 text-gray-700 dark:text-gray-300">{tc.input}</pre></div>
                  <div className="mt-2 text-xs"><span className="font-medium text-gray-500">Output:</span><pre className="mt-1 text-gray-700 dark:text-gray-300">{tc.expected_output}</pre></div>
                </div>
              ))}
            </div>
          )}
          {problem.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-1">{problem.tags.map(t => <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">{t}</span>)}</div>}
        </div>

        {/* Right: Code editor + results */}
        <div className="flex w-1/2 flex-col gap-3">
          <div className="flex items-center gap-2">
            <select value={language} onChange={e => setLanguage(e.target.value)} className="input text-sm">
              {LANGUAGES.map(l => <option key={l} value={l}>{l === 'cpp' ? 'C++' : l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
            </select>
            <div className="flex-1" />
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary text-sm">
              {submitting ? 'Running...' : 'Submit'}
            </button>
          </div>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            className="flex-1 resize-none rounded-lg border border-gray-200 bg-gray-950 p-4 font-mono text-sm text-green-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700"
            spellCheck={false}
            placeholder="Write your code here..."
          />

          {/* Results */}
          {result && (
            <div className={`rounded-lg border p-4 ${result.status === 'accepted' ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-lg font-bold ${result.status === 'accepted' ? 'text-green-600' : 'text-red-600'}`}>
                  {result.status === 'accepted' ? 'Accepted' : result.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <span className="text-sm text-gray-500">{result.passed_test_cases}/{result.total_test_cases} passed</span>
              </div>
              {result.error_message && <pre className="mt-2 text-xs text-red-600">{result.error_message}</pre>}
              {result.test_results.length > 0 && (
                <div className="mt-3 space-y-2">
                  {result.test_results.map((tr, i) => (
                    <div key={i} className={`rounded p-2 text-xs ${tr.passed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                      <span className="font-medium">{tr.passed ? 'Pass' : 'Fail'}</span>
                      {!tr.passed && <div className="mt-1 text-gray-600">Expected: {tr.expected} | Got: {tr.output}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
