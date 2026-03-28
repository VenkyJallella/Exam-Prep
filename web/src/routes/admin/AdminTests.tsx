import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { adminAPI } from '@/lib/api/admin';
import { examsAPI, type Exam } from '@/lib/api/exams';
import toast from 'react-hot-toast';

interface TestRow {
  id: string;
  title: string;
  description: string | null;
  exam_id: string;
  test_type: string;
  duration_minutes: number;
  total_marks: number;
  negative_marking_pct: number;
  is_published: boolean;
  question_count: number;
  created_at: string;
}

export default function AdminTests() {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [exams, setExams] = useState<Exam[]>([]);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    exam_id: '',
    test_type: 'mock',
    duration_minutes: 60,
    total_marks: 100,
    negative_marking_pct: 0,
    instructions: '',
  });
  const [creating, setCreating] = useState(false);

  const loadTests = () => {
    setLoading(true);
    adminAPI
      .listTests({ search: search || undefined })
      .then((r) => setTests(r.data.data))
      .catch(() => toast.error('Failed to load tests'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTests();
    examsAPI.list().then((r) => setExams(r.data.data)).catch(() => {});
  }, []);

  const handleSearch = () => loadTests();

  const handleTogglePublish = async (id: string) => {
    try {
      await adminAPI.toggleTestPublish(id);
      toast.success('Publish status toggled');
      loadTests();
    } catch {
      toast.error('Failed to toggle publish');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this test?')) return;
    try {
      await adminAPI.deleteTest(id);
      toast.success('Test deleted');
      loadTests();
    } catch {
      toast.error('Failed to delete test');
    }
  };

  const handleCreate = async () => {
    if (!form.title || !form.exam_id) {
      toast.error('Title and exam are required');
      return;
    }
    setCreating(true);
    try {
      await adminAPI.createTest(form);
      toast.success('Test created');
      setShowCreate(false);
      setForm({
        title: '',
        description: '',
        exam_id: '',
        test_type: 'mock',
        duration_minutes: 60,
        total_marks: 100,
        negative_marking_pct: 0,
        instructions: '',
      });
      loadTests();
    } catch {
      toast.error('Failed to create test');
    } finally {
      setCreating(false);
    }
  };

  const examName = (examId: string) =>
    exams.find((e) => e.id === examId)?.name || examId;

  return (
    <>
      <Helmet>
        <title>Manage Tests - Admin - ExamPrep</title>
        <meta name="description" content="Admin test management. Create, edit, and manage mock tests on ExamPrep." />
      </Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tests</h1>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
            Create Test
          </button>
        </div>

        {/* Filters */}
        <div className="card flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search tests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="input max-w-xs"
          />
          <button onClick={handleSearch} className="btn-secondary text-sm">
            Search
          </button>
          <span className="ml-auto text-sm text-gray-500">{tests.length} tests</span>
        </div>

        {/* Table */}
        <div className="card overflow-hidden p-0">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
            </div>
          ) : tests.length === 0 ? (
            <div className="py-12 text-center text-gray-400">No tests found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                    <th className="px-4 py-3 font-medium text-gray-500">Title</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Type</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Questions</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Duration</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Marks</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Created</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((t) => (
                    <tr key={t.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="max-w-xs px-4 py-3">
                        <p className="truncate font-medium text-gray-900 dark:text-white">
                          {t.title}
                        </p>
                        <p className="truncate text-xs text-gray-400">{examName(t.exam_id)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {t.test_type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{t.question_count}</td>
                      <td className="px-4 py-3 text-gray-500">{t.duration_minutes}m</td>
                      <td className="px-4 py-3 text-gray-500">{t.total_marks}</td>
                      <td className="px-4 py-3">
                        {t.is_published ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                            Published
                          </span>
                        ) : (
                          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleTogglePublish(t.id)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-700"
                          >
                            {t.is_published ? 'Unpublish' : 'Publish'}
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="text-xs font-medium text-red-600 hover:text-red-700"
                          >
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
      </div>

      {/* Create Test Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Test</h3>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input w-full"
                  placeholder="e.g. UPSC Prelims Mock 1"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input w-full"
                  rows={2}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Exam
                </label>
                <select
                  value={form.exam_id}
                  onChange={(e) => setForm({ ...form, exam_id: e.target.value })}
                  className="input w-full"
                >
                  <option value="">Select exam</option>
                  {exams.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Type
                </label>
                <select
                  value={form.test_type}
                  onChange={(e) => setForm({ ...form, test_type: e.target.value })}
                  className="input w-full"
                >
                  <option value="mock">Mock</option>
                  <option value="topic">Topic</option>
                  <option value="sectional">Sectional</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    value={form.duration_minutes}
                    onChange={(e) =>
                      setForm({ ...form, duration_minutes: Number(e.target.value) })
                    }
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    value={form.total_marks}
                    onChange={(e) => setForm({ ...form, total_marks: Number(e.target.value) })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Neg. Mark %
                  </label>
                  <input
                    type="number"
                    value={form.negative_marking_pct}
                    onChange={(e) =>
                      setForm({ ...form, negative_marking_pct: Number(e.target.value) })
                    }
                    className="input w-full"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Instructions
                </label>
                <textarea
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  className="input w-full"
                  rows={3}
                  placeholder="Optional instructions for test takers..."
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !form.title || !form.exam_id}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
