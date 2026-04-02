import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import apiClient from '../../lib/api/client';
import toast from 'react-hot-toast';

interface IQ { id: string; question: string; answer: string; category: string; topic: string; difficulty: string; tags: string[]; companies: string[]; }

const TOPICS: Record<string, string[]> = {
  technical: ['Java', 'Python', 'JavaScript', 'React', 'Node.js', 'SQL', 'DBMS', 'OS', 'Computer Networks', 'DSA', 'System Design', 'REST API', 'Git', 'Docker', 'AWS'],
  hr_behavioral: ['General HR', 'Behavioral', 'Situational', 'Leadership', 'Teamwork'],
  domain_specific: ['Data Science', 'Machine Learning', 'Cloud Computing', 'DevOps', 'Cybersecurity', 'Blockchain', 'Banking & Finance'],
};

const CAT_LABEL: Record<string, string> = { technical: 'Technical', hr_behavioral: 'HR & Behavioral', domain_specific: 'Domain Specific' };

export default function AdminInterview() {
  const [questions, setQuestions] = useState<IQ[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [search, setSearch] = useState('');

  const [showGenerate, setShowGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genCat, setGenCat] = useState('technical');
  const [genTopic, setGenTopic] = useState('Java');
  const [genCount, setGenCount] = useState(5);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newQ, setNewQ] = useState('');
  const [newA, setNewA] = useState('');
  const [newCat, setNewCat] = useState('technical');
  const [newTopic, setNewTopic] = useState('Java');
  const [newDiff, setNewDiff] = useState('medium');
  const [newTags, setNewTags] = useState('');

  const load = () => {
    setLoading(true);
    const params: Record<string, any> = { page };
    if (filterCat) params.category = filterCat;
    if (filterTopic) params.topic = filterTopic;
    if (search) params.search = search;
    apiClient.get('/interview/admin/list', { params }).then(r => {
      setQuestions(r.data.data);
      setTotal(r.data.meta.total);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, filterCat, filterTopic]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await apiClient.post('/interview/admin/generate', { count: genCount, category: genCat, topic: genTopic });
      toast.success(`Generated ${res.data.data.generated} interview questions!`);
      setShowGenerate(false);
      load();
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Failed to generate'); }
    finally { setGenerating(false); }
  };

  const handleCreate = async () => {
    if (!newQ || !newA) { toast.error('Question and answer required'); return; }
    setCreating(true);
    try {
      await apiClient.post('/interview/admin/create', {
        question: newQ, answer: newA, category: newCat, topic: newTopic, difficulty: newDiff,
        tags: newTags ? newTags.split(',').map(t => t.trim()) : [],
      });
      toast.success('Question created!');
      setShowCreate(false);
      setNewQ(''); setNewA(''); setNewTags('');
      load();
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Failed to create'); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    try {
      await apiClient.delete(`/interview/admin/${id}`);
      toast.success('Deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const diffColor = (d: string) => d === 'easy' ? 'text-green-600' : d === 'hard' ? 'text-red-600' : 'text-yellow-600';

  return (
    <>
      <Helmet><title>Admin - Interview Questions | ExamPrep</title></Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Interview Questions</h1>
            <p className="mt-1 text-sm text-gray-500">{total} questions</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowGenerate(true)} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Generate with AI</button>
            <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">Add Manual</button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setFilterTopic(''); setPage(1); }} className="input w-auto">
            <option value="">All Categories</option>
            {Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {filterCat && (
            <select value={filterTopic} onChange={e => { setFilterTopic(e.target.value); setPage(1); }} className="input w-auto">
              <option value="">All Topics</option>
              {(TOPICS[filterCat] || []).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <form onSubmit={e => { e.preventDefault(); setPage(1); load(); }} className="flex gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="input w-48" />
            <button type="submit" className="btn-secondary text-sm">Search</button>
          </form>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Question</th>
                <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Category</th>
                <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Topic</th>
                <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Difficulty</th>
                <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : questions.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No interview questions yet</td></tr>
              ) : questions.map(q => (
                <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="max-w-xs truncate px-4 py-3 font-medium text-gray-900 dark:text-white">{q.question.slice(0, 80)}{q.question.length > 80 ? '...' : ''}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{CAT_LABEL[q.category] || q.category}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{q.topic}</td>
                  <td className={`px-4 py-3 font-medium capitalize ${diffColor(q.difficulty)}`}>{q.difficulty}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(q.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm disabled:opacity-50">Previous</button>
            <span className="text-sm text-gray-600 dark:text-gray-400">Page {page} of {Math.ceil(total / 20)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)} className="btn-secondary text-sm disabled:opacity-50">Next</button>
          </div>
        )}
      </div>

      {/* Generate AI modal */}
      {showGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Generate Interview Questions with AI</h2>
            <p className="mt-1 text-sm text-gray-500">AI will generate questions with detailed markdown answers.</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                <select value={genCat} onChange={e => { setGenCat(e.target.value); setGenTopic(TOPICS[e.target.value]?.[0] || ''); }} className="input mt-1 w-full">
                  {Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Topic</label>
                <select value={genTopic} onChange={e => setGenTopic(e.target.value)} className="input mt-1 w-full">
                  {(TOPICS[genCat] || []).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Count</label>
                <select value={genCount} onChange={e => setGenCount(Number(e.target.value))} className="input mt-1 w-full">
                  <option value={5}>5 questions</option>
                  <option value={10}>10 questions</option>
                  <option value={15}>15 questions</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowGenerate(false)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleGenerate} disabled={generating} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Interview Question</h2>
            <div className="mt-4 space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Question *</label><textarea value={newQ} onChange={e => setNewQ(e.target.value)} rows={3} className="input mt-1 w-full" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Answer (Markdown) *</label><textarea value={newA} onChange={e => setNewA(e.target.value)} rows={8} className="input mt-1 w-full font-mono text-sm" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                  <select value={newCat} onChange={e => { setNewCat(e.target.value); setNewTopic(TOPICS[e.target.value]?.[0] || ''); }} className="input mt-1 w-full">
                    {Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Topic</label>
                  <select value={newTopic} onChange={e => setNewTopic(e.target.value)} className="input mt-1 w-full">
                    {(TOPICS[newCat] || []).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Difficulty</label>
                  <select value={newDiff} onChange={e => setNewDiff(e.target.value)} className="input mt-1 w-full">
                    <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tags (comma-separated)</label><input value={newTags} onChange={e => setNewTags(e.target.value)} className="input mt-1 w-full" placeholder="OOP, Core Java" /></div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleCreate} disabled={creating} className="btn-primary text-sm">{creating ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
