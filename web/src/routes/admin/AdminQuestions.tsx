import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { adminAPI } from '@/lib/api/admin';
import { examsAPI, type Exam, type Subject, type Topic } from '@/lib/api/exams';
import toast from 'react-hot-toast';

interface QuestionRow {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: number;
  topic_id: string | null;
  is_verified: boolean;
  times_attempted: number;
  times_correct: number;
  created_at: string;
}

export default function AdminQuestions() {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState<boolean | undefined>(undefined);

  // CSV Import
  const [showImport, setShowImport] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);

  // AI Generate modal
  const [showGenerate, setShowGenerate] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [genExam, setGenExam] = useState('');
  const [genTopic, setGenTopic] = useState('');
  const [genCount, setGenCount] = useState(5);
  const [genDifficulty, setGenDifficulty] = useState(3);
  const [generating, setGenerating] = useState(false);

  const loadQuestions = () => {
    setLoading(true);
    adminAPI.listQuestions({ page, verified: verifiedFilter, search: search || undefined })
      .then((r) => {
        setQuestions(r.data.data);
        setTotal(r.data.meta?.total || 0);
      })
      .catch(() => toast.error('Failed to load questions'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadQuestions(); }, [page, verifiedFilter]);

  useEffect(() => {
    examsAPI.list().then((r) => setExams(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!genExam) { setSubjects([]); setTopics([]); return; }
    const exam = exams.find((e) => e.id === genExam);
    if (exam) {
      examsAPI.getSubjects(exam.slug).then((r) => setSubjects(r.data.data)).catch(() => {});
    }
  }, [genExam, exams]);

  const handleSearch = () => {
    setPage(1);
    loadQuestions();
  };

  const handleVerify = async (id: string) => {
    try {
      await adminAPI.updateQuestion(id, { is_verified: true });
      toast.success('Question verified');
      loadQuestions();
    } catch {
      toast.error('Failed to verify');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    try {
      await adminAPI.deleteQuestion(id);
      toast.success('Question deleted');
      loadQuestions();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleImportCSV = async () => {
    if (!csvFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await adminAPI.importCSV(csvFile);
      const data = res.data.data;
      setImportResult(data);
      if (data.imported > 0) {
        toast.success(`Imported ${data.imported} questions`);
        loadQuestions();
      }
      if (data.errors.length > 0) {
        toast.error(`${data.errors.length} rows had errors`);
      }
    } catch {
      toast.error('CSV import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleGenerate = async () => {
    if (!genExam || !genTopic) {
      toast.error('Select exam and topic');
      return;
    }
    setGenerating(true);
    try {
      await adminAPI.generateQuestions({
        exam_id: genExam,
        topic_id: genTopic,
        count: genCount,
        difficulty: genDifficulty,
      });
      toast.success(`Generated ${genCount} questions!`);
      setShowGenerate(false);
      loadQuestions();
    } catch {
      toast.error('AI generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Manage Questions - Admin - ExamPrep</title>
        <meta name="description" content="Admin question management. Create, edit, and manage exam questions on ExamPrep." />
      </Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Questions</h1>
          <div className="flex gap-3">
            <button onClick={() => { setShowImport(true); setImportResult(null); setCsvFile(null); }} className="btn-secondary text-sm">
              Import CSV
            </button>
            <button onClick={() => setShowGenerate(true)} className="btn-primary text-sm">
              AI Generate
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="input max-w-xs"
          />
          <button onClick={handleSearch} className="btn-secondary text-sm">Search</button>
          <select
            value={verifiedFilter === undefined ? '' : verifiedFilter ? 'true' : 'false'}
            onChange={(e) => {
              setVerifiedFilter(e.target.value === '' ? undefined : e.target.value === 'true');
              setPage(1);
            }}
            className="input max-w-[150px]"
          >
            <option value="">All Status</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>
          <span className="ml-auto text-sm text-gray-500">{total} questions</span>
        </div>

        {/* Table */}
        <div className="card overflow-hidden p-0">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
            </div>
          ) : questions.length === 0 ? (
            <div className="py-12 text-center text-gray-400">No questions found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                    <th className="px-4 py-3 font-medium text-gray-500">Question</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Type</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Diff</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Stats</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => (
                    <tr key={q.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="max-w-sm px-4 py-3">
                        <p className="truncate text-gray-900 dark:text-white">{q.question_text}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{q.question_type}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          q.difficulty <= 2 ? 'bg-green-100 text-green-700' :
                          q.difficulty <= 3 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {q.difficulty}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {q.times_attempted > 0
                          ? `${q.times_correct}/${q.times_attempted} (${Math.round(q.times_correct / q.times_attempted * 100)}%)`
                          : 'No data'}
                      </td>
                      <td className="px-4 py-3">
                        {q.is_verified ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Verified</span>
                        ) : (
                          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">Unverified</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {!q.is_verified && (
                            <button onClick={() => handleVerify(q.id)} className="text-xs font-medium text-green-600 hover:text-green-700">
                              Verify
                            </button>
                          )}
                          <button onClick={() => handleDelete(q.id)} className="text-xs font-medium text-red-600 hover:text-red-700">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex justify-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm disabled:opacity-40">
              Previous
            </button>
            <span className="flex items-center px-3 text-sm text-gray-500">
              Page {page} of {Math.ceil(total / 20)}
            </span>
            <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / 20)} className="btn-secondary text-sm disabled:opacity-40">
              Next
            </button>
          </div>
        )}
      </div>

      {/* CSV Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Import Questions from CSV</h3>
            <p className="mt-1 text-sm text-gray-500">
              Expected columns: question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty, exam_id, topic_id, question_type
            </p>

            <div className="mt-4 space-y-4">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-700 hover:file:bg-primary-100"
              />

              {importResult && (
                <div className="rounded-lg border p-3 text-sm">
                  <p className="font-medium text-green-700">Imported: {importResult.imported}</p>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium text-red-700">Errors ({importResult.errors.length}):</p>
                      <ul className="mt-1 max-h-32 overflow-y-auto text-xs text-red-600">
                        {importResult.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowImport(false)} className="btn-secondary flex-1">
                Close
              </button>
              <button
                onClick={handleImportCSV}
                disabled={importing || !csvFile}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Upload & Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generate Modal */}
      {showGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Generate Questions</h3>
            <p className="mt-1 text-sm text-gray-500">Use GPT to generate questions for a topic</p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Exam</label>
                <select value={genExam} onChange={(e) => setGenExam(e.target.value)} className="input w-full">
                  <option value="">Select exam</option>
                  {exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>

              {subjects.length > 0 && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
                  <div className="flex flex-wrap gap-2">
                    {subjects.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          const exam = exams.find((e) => e.id === genExam);
                          if (exam) examsAPI.getTopics(exam.slug, s.id).then((r) => setTopics(r.data.data));
                        }}
                        className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {topics.length > 0 && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Topic</label>
                  <select value={genTopic} onChange={(e) => setGenTopic(e.target.value)} className="input w-full">
                    <option value="">Select topic</option>
                    {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Count</label>
                  <select value={genCount} onChange={(e) => setGenCount(Number(e.target.value))} className="input w-full">
                    {[3, 5, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Difficulty</label>
                  <select value={genDifficulty} onChange={(e) => setGenDifficulty(Number(e.target.value))} className="input w-full">
                    <option value={1}>Easy</option>
                    <option value={2}>Medium-Easy</option>
                    <option value={3}>Medium</option>
                    <option value={4}>Medium-Hard</option>
                    <option value={5}>Hard</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowGenerate(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || !genExam || !genTopic}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {generating ? 'Generating...' : `Generate ${genCount} Questions`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
