import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import apiClient from '../../lib/api/client';
import toast from 'react-hot-toast';

interface PoolEntry { topic_id: string; difficulty: number; count: number; }
interface LowPool { topic_id: string; topic_name: string; exam_id: string; difficulty: number; current_count: number; needed: number; }

export default function AdminPoolManager() {
  const [pool, setPool] = useState<PoolEntry[]>([]);
  const [lowPools, setLowPools] = useState<LowPool[]>([]);
  const [lowCount, setLowCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [diffFilter, setDiffFilter] = useState('');
  const [refilling, setRefilling] = useState(false);

  const loadData = () => {
    setLoading(true);
    apiClient.get('/admin/pool/status')
      .then(r => {
        setPool(r.data.data.pool || []);
        setLowCount(r.data.data.low_pools || 0);
        setLowPools(r.data.data.low_pool_details || []);
      })
      .catch(() => toast.error('Failed to load pool status'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleRefill = async () => {
    setRefilling(true);
    try {
      await apiClient.post('/admin/pool/refill');
      toast.success('Pool refill triggered! Questions are being generated in the background.');
    } catch { toast.error('Refill failed'); }
    finally { setRefilling(false); }
  };

  const totalQuestions = pool.reduce((s, p) => s + p.count, 0);

  const filteredLow = lowPools.filter(p => {
    if (search && !p.topic_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (diffFilter && p.difficulty !== Number(diffFilter)) return false;
    return true;
  });

  const statusBadge = (count: number) => {
    if (count === 0) return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800">Empty</span>;
    if (count < 5) return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">Critical</span>;
    if (count < 10) return <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Low</span>;
    return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">Healthy</span>;
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" /></div>;

  return (
    <>
      <Helmet><title>Admin - Question Pool | ExamPrep</title></Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Question Pool Manager</h1>
            <p className="mt-1 text-sm text-gray-500">Monitor and refill the question pool</p>
          </div>
          <button onClick={handleRefill} disabled={refilling} className="btn-primary text-sm">
            {refilling ? 'Refilling...' : 'Refill Low Pools'}
          </button>
        </div>

        {/* Overview cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white">
            <p className="text-sm opacity-80">Total Questions</p>
            <p className="mt-1 text-3xl font-bold">{totalQuestions}</p>
          </div>
          <div className={`rounded-xl p-5 text-white ${lowCount > 0 ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-green-500 to-green-600'}`}>
            <p className="text-sm opacity-80">Low Pools</p>
            <p className="mt-1 text-3xl font-bold">{lowCount}</p>
            <p className="mt-1 text-xs opacity-70">{lowCount > 0 ? 'Need refill' : 'All healthy'}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-5 text-white">
            <p className="text-sm opacity-80">Unique Topic+Difficulty</p>
            <p className="mt-1 text-3xl font-bold">{pool.length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search topic..." className="input flex-1" />
          <select value={diffFilter} onChange={e => setDiffFilter(e.target.value)} className="input w-36">
            <option value="">All Levels</option>
            {[1,2,3,4,5].map(d => <option key={d} value={d}>Level {d}</option>)}
          </select>
          <button onClick={loadData} className="btn-secondary text-sm">Refresh</button>
        </div>

        {/* Low pools table */}
        {filteredLow.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Topic</th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Difficulty</th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Current</th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Needed</th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredLow.map((p, i) => (
                  <tr key={`${p.topic_id}-${p.difficulty}`} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.topic_name}</td>
                    <td className="px-4 py-3">
                      <span className="text-gray-500">{'●'.repeat(p.difficulty)}{'○'.repeat(5 - p.difficulty)}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.current_count}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">+{p.needed}</td>
                    <td className="px-4 py-3">{statusBadge(p.current_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredLow.length === 0 && !loading && (
          <div className="card py-12 text-center text-gray-500">
            {lowCount === 0 ? 'All question pools are healthy!' : 'No matching pools found'}
          </div>
        )}
      </div>
    </>
  );
}
