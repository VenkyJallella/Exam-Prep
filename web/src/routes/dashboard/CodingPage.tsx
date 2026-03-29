import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import apiClient from '@/lib/api/client';

interface CodingProblem {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  tags: string[];
  acceptance_rate: number;
  total_submissions: number;
}

export default function CodingPage() {
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page };
      if (search) params.search = search;
      if (difficulty) params.difficulty = difficulty;
      const res = await apiClient.get('/coding', { params });
      setProblems(res.data.data);
      setTotal(res.data.meta.total);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProblems(); }, [page, difficulty]);

  const diffColor = (d: string) => {
    if (d === 'easy') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (d === 'hard') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <Helmet><title>Coding Practice - ExamPrep</title></Helmet>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Coding Practice</h1>
          <p className="mt-1 text-sm text-gray-500">Solve coding problems to sharpen your programming skills</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchProblems(); }} className="flex-1">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search problems..." className="input w-full" />
          </form>
          <select value={difficulty} onChange={(e) => { setDifficulty(e.target.value); setPage(1); }} className="input w-40">
            <option value="">All Levels</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">#</th>
                <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Title</th>
                <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Difficulty</th>
                <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Acceptance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : problems.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No coding problems yet. Admin can add them from the panel.</td></tr>
              ) : problems.map((p, i) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-4 py-3 text-gray-500">{(page - 1) * 20 + i + 1}</td>
                  <td className="px-4 py-3">
                    <Link to={`/coding/${p.slug}`} className="font-medium text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400">
                      {p.title}
                    </Link>
                    {p.tags.length > 0 && (
                      <div className="mt-0.5 flex gap-1">{p.tags.slice(0, 3).map(t => (
                        <span key={t} className="text-xs text-gray-400">{t}</span>
                      ))}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${diffColor(p.difficulty)}`}>{p.difficulty}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.acceptance_rate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm disabled:opacity-50">Previous</button>
            <span className="text-sm text-gray-600 dark:text-gray-400">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm disabled:opacity-50">Next</button>
          </div>
        )}
      </div>
    </>
  );
}
