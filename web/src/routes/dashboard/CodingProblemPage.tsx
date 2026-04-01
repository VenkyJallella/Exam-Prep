import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import apiClient from '@/lib/api/client';
import toast from 'react-hot-toast';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { oneDark } from '@codemirror/theme-one-dark';

const LANGUAGES = [
  { id: 'python', label: 'Python 3', extension: () => python() },
  { id: 'java', label: 'Java', extension: () => java() },
] as const;

interface Problem {
  id: string; title: string; slug: string; description: string; difficulty: string;
  constraints: string | null; input_format: string | null; output_format: string | null;
  sample_test_cases: Array<{ input: string; expected_output: string }>;
  starter_code: Record<string, string>; time_limit_ms: number; memory_limit_mb: number;
  tags: string[]; acceptance_rate: number;
}

interface TestResult {
  passed: boolean; output: string; expected: string; time_ms?: number; is_sample?: boolean;
}

interface RunResult {
  status: string; passed_test_cases: number; total_test_cases: number;
  execution_time_ms: number | null; error_message: string | null;
  test_results: TestResult[];
}

export default function CodingProblemPage() {
  const { slug } = useParams<{ slug: string }>();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [activeTab, setActiveTab] = useState<'testcases' | 'result' | 'custom'>('testcases');
  const [customInput, setCustomInput] = useState('');
  const [customOutput, setCustomOutput] = useState('');

  useEffect(() => {
    if (!slug) return;
    apiClient.get(`/coding/${slug}`)
      .then(res => {
        const p = res.data.data;
        setProblem(p);
        setCode(p.starter_code?.python || '# Write your solution here\n');
        setLanguage('python');
        if (p.sample_test_cases?.length > 0) {
          setCustomInput(p.sample_test_cases[0].input);
        }
      })
      .catch(() => toast.error('Problem not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleRun = async () => {
    if (!slug || !code.trim()) return;
    setRunning(true);
    setResult(null);
    setActiveTab('result');
    try {
      const res = await apiClient.post(`/coding/${slug}/run`, { language, code });
      setResult(res.data.data);
    } catch { toast.error('Run failed'); }
    finally { setRunning(false); }
  };

  const handleRunCustom = async () => {
    if (!slug || !code.trim()) return;
    setRunning(true);
    setCustomOutput('');
    try {
      const res = await apiClient.post(`/coding/${slug}/run`, { language, code, custom_input: customInput });
      setCustomOutput(res.data.data.output || res.data.data.error_message || 'No output');
    } catch { toast.error('Run failed'); }
    finally { setRunning(false); }
  };

  const handleSubmit = async () => {
    if (!slug || !code.trim()) return;
    setSubmitting(true);
    setResult(null);
    setActiveTab('result');
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
      <div className="flex h-[calc(100vh-4.5rem)] gap-0">
        {/* Left: Problem description */}
        <div className="w-[45%] overflow-y-auto border-r border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
          <Link to="/coding" className="text-sm text-primary-600 hover:underline">&larr; All Problems</Link>
          <h1 className="mt-3 text-xl font-bold text-gray-900 dark:text-white">{problem.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm">
            <span className={`font-medium capitalize ${diffColor}`}>{problem.difficulty}</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">{problem.acceptance_rate.toFixed(1)}% acceptance</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">{problem.time_limit_ms}ms</span>
          </div>

          <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">{problem.description}</div>

          {problem.input_format && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Input Format</h3>
              <p className="mt-1 text-sm text-gray-500">{problem.input_format}</p>
            </div>
          )}
          {problem.output_format && (
            <div className="mt-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Output Format</h3>
              <p className="mt-1 text-sm text-gray-500">{problem.output_format}</p>
            </div>
          )}
          {problem.constraints && (
            <div className="mt-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Constraints</h3>
              <pre className="mt-1 text-xs text-gray-500">{problem.constraints}</pre>
            </div>
          )}

          {problem.sample_test_cases.length > 0 && (
            <div className="mt-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Examples</h3>
              {problem.sample_test_cases.map((tc, i) => (
                <div key={i} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                  <div className="text-xs">
                    <span className="font-medium text-gray-500">Input:</span>
                    <pre className="mt-1 rounded bg-gray-100 p-2 text-gray-700 dark:bg-gray-900 dark:text-gray-300">{tc.input}</pre>
                  </div>
                  <div className="mt-2 text-xs">
                    <span className="font-medium text-gray-500">Output:</span>
                    <pre className="mt-1 rounded bg-gray-100 p-2 text-gray-700 dark:bg-gray-900 dark:text-gray-300">{tc.expected_output}</pre>
                  </div>
                </div>
              ))}
            </div>
          )}

          {problem.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1">
              {problem.tags.map(t => (
                <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Right: Code editor + results */}
        <div className="flex w-[55%] flex-col">
          {/* Editor header */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <select
                value={language}
                onChange={(e) => {
                  const lang = e.target.value;
                  setLanguage(lang);
                  setCode(problem?.starter_code?.[lang] || (lang === 'java' ? 'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n    }\n}' : '# Write your solution here\n'));
                  setResult(null);
                }}
                className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0 cursor-pointer"
              >
                {LANGUAGES.map(l => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleRun} disabled={running || submitting}
                className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                {running ? 'Running...' : 'Run'}
              </button>
              <button onClick={handleSubmit} disabled={running || submitting}
                className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>

          {/* CodeMirror Editor */}
          <div className="flex-1 overflow-hidden">
            <CodeMirror
              value={code}
              onChange={(val) => setCode(val)}
              theme={oneDark}
              extensions={[LANGUAGES.find(l => l.id === language)?.extension() ?? python()]}
              height="100%"
              style={{ height: '100%', fontSize: '14px' }}
              basicSetup={{
                lineNumbers: true,
                highlightActiveLine: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
                foldGutter: true,
                indentOnInput: true,
                tabSize: 4,
              }}
            />
          </div>

          {/* Bottom panel: Test cases / Results / Custom Input */}
          <div className="h-[35%] border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800">
              {(['testcases', 'result', 'custom'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-medium ${activeTab === tab ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                  {tab === 'testcases' ? 'Test Cases' : tab === 'result' ? 'Result' : 'Custom Input'}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto p-3" style={{ height: 'calc(100% - 33px)' }}>
              {/* Test Cases tab */}
              {activeTab === 'testcases' && problem.sample_test_cases.map((tc, i) => (
                <div key={i} className="mb-2 rounded bg-gray-50 p-2 text-xs dark:bg-gray-900">
                  <span className="font-medium text-gray-500">Case {i + 1}:</span>
                  <div className="mt-1"><span className="text-gray-400">Input: </span><span className="text-gray-700 dark:text-gray-300">{tc.input}</span></div>
                  <div><span className="text-gray-400">Expected: </span><span className="text-gray-700 dark:text-gray-300">{tc.expected_output}</span></div>
                </div>
              ))}

              {/* Result tab */}
              {activeTab === 'result' && (running || submitting) && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" />
                  {submitting ? 'Running all test cases...' : 'Running sample tests...'}
                </div>
              )}
              {activeTab === 'result' && result && (
                <div>
                  <div className={`mb-3 flex items-center justify-between rounded-lg p-3 ${
                    result.status === 'accepted' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
                  }`}>
                    <span className={`text-sm font-bold ${result.status === 'accepted' ? 'text-green-600' : 'text-red-600'}`}>
                      {result.status === 'accepted' ? 'Accepted' : result.status === 'time_limit_exceeded' ? 'Time Limit Exceeded' : result.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{result.passed_test_cases}/{result.total_test_cases} passed</span>
                      {result.execution_time_ms != null && <span>{result.execution_time_ms}ms</span>}
                    </div>
                  </div>
                  {result.error_message && result.status !== 'wrong_answer' && (
                    <pre className="mb-2 rounded bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20">{result.error_message}</pre>
                  )}
                  {result.test_results.map((tr, i) => (
                    <div key={i} className={`mb-1 rounded p-2 text-xs ${tr.passed ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${tr.passed ? 'text-green-600' : 'text-red-600'}`}>
                          {tr.passed ? 'Passed' : 'Failed'} — Case {i + 1}
                        </span>
                        {tr.time_ms != null && <span className="text-gray-400">{tr.time_ms}ms</span>}
                      </div>
                      {!tr.passed && (
                        <div className="mt-1 space-y-1">
                          <div><span className="text-gray-400">Expected: </span><code className="text-gray-700 dark:text-gray-300">{tr.expected}</code></div>
                          <div><span className="text-gray-400">Got: </span><code className="text-red-600">{tr.output}</code></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Custom Input tab */}
              {activeTab === 'custom' && (
                <div className="space-y-2">
                  <textarea
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    className="w-full rounded border border-gray-200 bg-gray-50 p-2 font-mono text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                    rows={3}
                    placeholder="Enter custom input..."
                  />
                  <button onClick={handleRunCustom} disabled={running}
                    className="rounded bg-primary-600 px-3 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                    {running ? 'Running...' : 'Run with Custom Input'}
                  </button>
                  {customOutput && (
                    <div className="rounded bg-gray-900 p-2">
                      <span className="text-xs text-gray-400">Output:</span>
                      <pre className="mt-1 text-xs text-green-400">{customOutput}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
