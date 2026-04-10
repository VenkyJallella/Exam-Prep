import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import apiClient from '../../lib/api/client';

interface Job {
  id: string;
  title: string;
  slug: string;
  company: string | null;
  category: string;
  short_description: string;
  location: string | null;
  is_remote: boolean;
  salary_text: string | null;
  vacancies: number | null;
  apply_deadline: string | null;
  posted_date: string | null;
  tags: string[];
  is_featured: boolean;
}

interface CategoryCount {
  category: string;
  count: number;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  'govt-exam': { label: 'Govt Exams', icon: '🏛️', color: 'bg-blue-100 text-blue-700' },
  'tech': { label: 'Tech / IT', icon: '💻', color: 'bg-indigo-100 text-indigo-700' },
  'banking': { label: 'Banking', icon: '🏦', color: 'bg-orange-100 text-orange-700' },
  'ssc': { label: 'SSC', icon: '📋', color: 'bg-purple-100 text-purple-700' },
  'upsc': { label: 'UPSC', icon: '🏛️', color: 'bg-blue-100 text-blue-700' },
  'railway': { label: 'Railway', icon: '🚆', color: 'bg-green-100 text-green-700' },
  'defense': { label: 'Defense', icon: '🛡️', color: 'bg-red-100 text-red-700' },
  'psu': { label: 'PSU', icon: '🏭', color: 'bg-yellow-100 text-yellow-700' },
  'teaching': { label: 'Teaching', icon: '🎓', color: 'bg-pink-100 text-pink-700' },
  'police': { label: 'Police', icon: '👮', color: 'bg-cyan-100 text-cyan-700' },
  'state-govt': { label: 'State Govt', icon: '🏛️', color: 'bg-teal-100 text-teal-700' },
};

function formatDeadline(deadline: string | null): { text: string; urgent: boolean } | null {
  if (!deadline) return null;
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: 'Expired', urgent: false };
  if (days === 0) return { text: 'Last day!', urgent: true };
  if (days <= 7) return { text: `${days} days left`, urgent: true };
  return { text: `${days} days left`, urgent: false };
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, per_page: 20 };
      if (activeCategory) params.category = activeCategory;
      if (search) params.search = search;
      const res = await apiClient.get('/jobs', { params });
      setJobs(res.data.data);
      setTotal(res.data.meta.total);
    } catch {
      // silently fail for public page
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/jobs/categories');
      setCategories(res.data.data);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [page, activeCategory]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchJobs();
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <Helmet>
        <title>Govt Jobs & Tech Jobs 2026 — Latest Notifications | ExamPrep</title>
        <meta
          name="description"
          content="Latest govt jobs 2026 — SSC, UPSC, IBPS PO, Railway, Banking, PSU notifications. Plus remote tech jobs for Python, Java, React developers. Updated daily with apply links, eligibility & deadlines."
        />
        <meta property="og:title" content="Latest Govt Jobs & Tech Jobs 2026 | ExamPrep" />
        <meta
          property="og:description"
          content="SSC, UPSC, IBPS, Railway notifications + remote tech jobs. Updated daily."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://zencodio.com/jobs" />
        <link rel="canonical" href="https://zencodio.com/jobs" />
      </Helmet>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
              Latest{' '}
              <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                Govt & Tech Jobs
              </span>
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              SSC, UPSC, IBPS, Railway, Banking notifications + remote tech jobs. Updated daily.
            </p>

            <form onSubmit={handleSearch} className="mx-auto mt-8 flex max-w-md gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jobs by title, company..."
                className="input flex-1"
              />
              <button type="submit" className="btn-primary">Search</button>
            </form>
          </div>
        </div>
      </section>

      {/* Category chips */}
      <section className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => { setActiveCategory(''); setPage(1); }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activeCategory === ''
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              All ({total})
            </button>
            {categories.map((c) => {
              const meta = CATEGORY_LABELS[c.category] || { label: c.category, icon: '📌', color: '' };
              return (
                <button
                  key={c.category}
                  onClick={() => { setActiveCategory(c.category); setPage(1); }}
                  className={`flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    activeCategory === c.category
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  <span>{meta.icon}</span>
                  <span>{meta.label} ({c.count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Job list */}
      <section className="bg-gray-50 py-12 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-2xl bg-white p-12 text-center dark:bg-gray-950">
              <p className="text-lg text-gray-500">No jobs found. Try a different category or search.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {jobs.map((job) => {
                const meta = CATEGORY_LABELS[job.category] || { label: job.category, icon: '📌', color: 'bg-gray-100 text-gray-700' };
                const dl = formatDeadline(job.apply_deadline);
                return (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.slug}`}
                    className="group rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-primary-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-950 dark:hover:border-primary-700"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.color} dark:bg-opacity-20`}>
                            <span>{meta.icon}</span>
                            <span>{meta.label}</span>
                          </span>
                          {job.is_featured && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">⭐ Featured</span>
                          )}
                          {job.is_remote && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Remote</span>
                          )}
                          {dl && (
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${dl.urgent ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                              ⏰ {dl.text}
                            </span>
                          )}
                        </div>
                        <h2 className="mt-2 text-lg font-bold text-gray-900 group-hover:text-primary-600 dark:text-white">
                          {job.title}
                        </h2>
                        {job.company && (
                          <p className="mt-1 text-sm text-gray-500">{job.company}</p>
                        )}
                        <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                          {job.short_description}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          {job.location && <span>📍 {job.location}</span>}
                          {job.salary_text && <span>💰 {job.salary_text}</span>}
                          {job.vacancies && <span>👥 {job.vacancies.toLocaleString()} posts</span>}
                          {job.posted_date && (
                            <span>📅 Posted {new Date(job.posted_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                          )}
                        </div>
                      </div>
                      <div className="hidden text-primary-600 transition group-hover:translate-x-1 sm:block">
                        →
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
