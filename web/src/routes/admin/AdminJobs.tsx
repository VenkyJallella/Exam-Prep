import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import apiClient from '../../lib/api/client';

interface Job {
  id: string;
  title: string;
  slug: string;
  company: string | null;
  category: string;
  status: string;
  source: string;
  is_featured: boolean;
  view_count: number;
  apply_deadline: string | null;
  posted_date: string | null;
  vacancies: number | null;
}

export default function AdminJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      const res = await apiClient.get('/jobs/admin/list', { params });
      setJobs(res.data.data);
      setTotal(res.data.meta.total);
    } catch {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [page, statusFilter, categoryFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchJobs();
  };

  const handleIngest = async () => {
    if (!confirm('Trigger full ingestion now? This will fetch from all sources (~30-60 seconds).')) return;
    setIngesting(true);
    try {
      const res = await apiClient.post('/jobs/admin/ingest');
      const s = res.data.data;
      toast.success(`Ingested: ${s.curated || 0} curated, ${s.remoteok || 0} tech, ${s.govt_ai || 0} govt AI, linked ${s.linked_to_exams || 0}`);
      fetchJobs();
    } catch {
      toast.error('Ingestion failed. Check server logs.');
    } finally {
      setIngesting(false);
    }
  };

  const handleToggleStatus = async (job: Job) => {
    const newStatus = job.status === 'active' ? 'expired' : 'active';
    try {
      await apiClient.patch(`/jobs/admin/${job.id}`, { status: newStatus });
      toast.success(`Job ${newStatus}`);
      fetchJobs();
    } catch {
      toast.error('Update failed');
    }
  };

  const handleToggleFeatured = async (job: Job) => {
    try {
      await apiClient.patch(`/jobs/admin/${job.id}`, { is_featured: !job.is_featured });
      toast.success(job.is_featured ? 'Unfeatured' : 'Featured');
      fetchJobs();
    } catch {
      toast.error('Update failed');
    }
  };

  const handleDelete = async (job: Job) => {
    if (!confirm(`Delete "${job.title}"? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/jobs/admin/${job.id}`);
      toast.success('Deleted');
      fetchJobs();
    } catch {
      toast.error('Delete failed');
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <Helmet><title>Jobs — Admin</title></Helmet>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Jobs</h1>
            <p className="mt-1 text-sm text-gray-500">Manage job postings and trigger ingestion</p>
          </div>
          <button
            onClick={handleIngest}
            disabled={ingesting}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {ingesting ? 'Ingesting...' : '🔄 Run Ingestion'}
          </button>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title..."
              className="input flex-1 min-w-[200px]"
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="">All status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="draft">Draft</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="">All categories</option>
              <option value="govt-exam">Govt Exams</option>
              <option value="ssc">SSC</option>
              <option value="upsc">UPSC</option>
              <option value="banking">Banking</option>
              <option value="railway">Railway</option>
              <option value="defense">Defence</option>
              <option value="psu">PSU</option>
              <option value="teaching">Teaching</option>
              <option value="police">Police</option>
              <option value="tech">Tech</option>
            </select>
            <button type="submit" className="btn-primary">Search</button>
          </form>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500">
              No jobs found. Click "Run Ingestion" to populate.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Title</th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Category</th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Source</th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Views</th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white line-clamp-1">{job.title}</div>
                      {job.company && <div className="text-xs text-gray-500">{job.company}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {job.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{job.source}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        job.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : job.status === 'expired'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{job.view_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleFeatured(job)}
                          title={job.is_featured ? 'Unfeature' : 'Feature'}
                          className="rounded px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          {job.is_featured ? '⭐' : '☆'}
                        </button>
                        <button
                          onClick={() => handleToggleStatus(job)}
                          className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        >
                          {job.status === 'active' ? 'Expire' : 'Activate'}
                        </button>
                        <a
                          href={`/jobs/${job.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          View
                        </a>
                        <button
                          onClick={() => handleDelete(job)}
                          className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {page} of {totalPages} · {total} total
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
}
