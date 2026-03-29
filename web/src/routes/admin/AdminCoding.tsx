import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import apiClient from '../../lib/api/client';
import toast from 'react-hot-toast';

interface Problem { id: string; title: string; slug: string; difficulty: string; tags: string[]; acceptance_rate: number; total_submissions: number; }

export default function AdminCoding() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [constraints, setConstraints] = useState('');
  const [inputFormat, setInputFormat] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [testCasesJson, setTestCasesJson] = useState('[{"input": "", "expected_output": "", "is_sample": true}]');
  const [starterCodeJson, setStarterCodeJson] = useState('{"python": "# Write your solution\\n"}');
  const [tags, setTags] = useState('');
  const [creating, setCreating] = useState(false);

  const loadProblems = () => {
    setLoading(true);
    apiClient.get('/coding').then(r => { setProblems(r.data.data); setTotal(r.data.meta.total); }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadProblems(); }, []);

  const handleCreate = async () => {
    if (!title || !description) { toast.error('Title and description required'); return; }
    setCreating(true);
    try {
      const data: any = { title, description, difficulty, constraints, input_format: inputFormat, output_format: outputFormat };
      try { data.test_cases = JSON.parse(testCasesJson); } catch { toast.error('Invalid test cases JSON'); setCreating(false); return; }
      try { data.starter_code = JSON.parse(starterCodeJson); } catch { data.starter_code = {}; }
      data.tags = tags ? tags.split(',').map(t => t.trim()) : [];
      await apiClient.post('/coding/admin/create', data);
      toast.success('Problem created!');
      setShowCreate(false);
      setTitle(''); setDescription(''); setConstraints(''); setInputFormat(''); setOutputFormat('');
      loadProblems();
    } catch { toast.error('Failed to create'); }
    finally { setCreating(false); }
  };

  const diffColor = (d: string) => d === 'easy' ? 'text-green-600' : d === 'hard' ? 'text-red-600' : 'text-yellow-600';

  return (
    <>
      <Helmet><title>Admin - Coding Problems | ExamPrep</title></Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Coding Problems</h1>
            <p className="mt-1 text-sm text-gray-500">{total} problems</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">Add Problem</button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Title</th>
                <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Difficulty</th>
                <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Submissions</th>
                <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Acceptance</th>
                <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : problems.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No coding problems yet</td></tr>
              ) : problems.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.title}</td>
                  <td className={`px-4 py-3 font-medium capitalize ${diffColor(p.difficulty)}`}>{p.difficulty}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.total_submissions}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.acceptance_rate.toFixed(1)}%</td>
                  <td className="px-4 py-3"><div className="flex gap-1">{p.tags.slice(0, 3).map(t => <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">{t}</span>)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create Coding Problem</h2>
            <div className="mt-4 space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title *</label><input value={title} onChange={e => setTitle(e.target.value)} className="input mt-1 w-full" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (Markdown) *</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={6} className="input mt-1 w-full font-mono text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Difficulty</label><select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="input mt-1 w-full"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tags (comma)</label><input value={tags} onChange={e => setTags(e.target.value)} className="input mt-1 w-full" placeholder="Array, DP" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Constraints</label><textarea value={constraints} onChange={e => setConstraints(e.target.value)} rows={2} className="input mt-1 w-full text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Input Format</label><textarea value={inputFormat} onChange={e => setInputFormat(e.target.value)} rows={2} className="input mt-1 w-full text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Output Format</label><textarea value={outputFormat} onChange={e => setOutputFormat(e.target.value)} rows={2} className="input mt-1 w-full text-sm" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Test Cases (JSON)</label><textarea value={testCasesJson} onChange={e => setTestCasesJson(e.target.value)} rows={4} className="input mt-1 w-full font-mono text-xs" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Starter Code (JSON)</label><textarea value={starterCodeJson} onChange={e => setStarterCodeJson(e.target.value)} rows={3} className="input mt-1 w-full font-mono text-xs" /></div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleCreate} disabled={creating} className="btn-primary text-sm">{creating ? 'Creating...' : 'Create Problem'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
