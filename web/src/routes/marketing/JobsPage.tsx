import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import apiClient from '../../lib/api/client';
import toast from 'react-hot-toast';

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

const CATEGORY_LABELS: Record<string, { label: string; icon: string; color: string; seoTitle: string; seoDescription: string }> = {
  'govt-exam': {
    label: 'Govt Exams',
    icon: '🏛️',
    color: 'bg-blue-100 text-blue-700',
    seoTitle: 'Latest Govt Jobs 2026 — All Categories',
    seoDescription: 'Browse all latest government job notifications in India for 2026. SSC, UPSC, IBPS, RRB, Banking, Defence, Teaching, Police and more.',
  },
  'tech': {
    label: 'Tech / IT',
    icon: '💻',
    color: 'bg-indigo-100 text-indigo-700',
    seoTitle: 'Remote Tech Jobs 2026 — Python, Java, React Developer Jobs',
    seoDescription: 'Latest remote tech and IT jobs for software developers — Python, Java, React, Node.js, DevOps roles. Updated daily with global remote opportunities.',
  },
  'banking': {
    label: 'Banking',
    icon: '🏦',
    color: 'bg-orange-100 text-orange-700',
    seoTitle: 'Banking Jobs 2026 — IBPS PO, SBI, RBI, LIC Notifications',
    seoDescription: 'Latest banking job notifications 2026. IBPS PO, IBPS Clerk, SBI PO, SBI Clerk, RBI Grade B, LIC AAO with eligibility, salary and apply links.',
  },
  'ssc': {
    label: 'SSC',
    icon: '📋',
    color: 'bg-purple-100 text-purple-700',
    seoTitle: 'SSC Jobs 2026 — CGL, CHSL, MTS, GD Constable Notifications',
    seoDescription: 'Latest SSC notifications 2026. SSC CGL, SSC CHSL, SSC MTS, SSC GD Constable, SSC Stenographer with eligibility, vacancies and apply links.',
  },
  'upsc': {
    label: 'UPSC',
    icon: '🏛️',
    color: 'bg-blue-100 text-blue-700',
    seoTitle: 'UPSC Jobs 2026 — Civil Services, NDA, CDS, ESE Notifications',
    seoDescription: 'Latest UPSC notifications 2026. Civil Services Examination (IAS/IPS/IFS), NDA, CDS, Engineering Services, Indian Forest Service.',
  },
  'railway': {
    label: 'Railway',
    icon: '🚆',
    color: 'bg-green-100 text-green-700',
    seoTitle: 'Railway Jobs 2026 — RRB NTPC, Group D, ALP, JE Notifications',
    seoDescription: 'Latest Indian Railway job notifications 2026. RRB NTPC, RRB Group D, RRB ALP, RRB Junior Engineer with vacancy details and apply links.',
  },
  'defense': {
    label: 'Defence',
    icon: '🛡️',
    color: 'bg-red-100 text-red-700',
    seoTitle: 'Defence Jobs 2026 — Army, Navy, Air Force, NDA, CDS, AFCAT',
    seoDescription: 'Latest defence job notifications 2026. Indian Army Agniveer, Indian Navy SSR, Air Force AFCAT, NDA, CDS officer entry.',
  },
  'psu': {
    label: 'PSU',
    icon: '🏭',
    color: 'bg-yellow-100 text-yellow-700',
    seoTitle: 'PSU Jobs 2026 — ISRO, DRDO, NTPC, ONGC, BHEL Recruitment',
    seoDescription: 'Latest PSU job notifications 2026. ISRO Scientist, DRDO Scientist B, NTPC, ONGC, BHEL, GAIL recruitment for engineers and graduates.',
  },
  'teaching': {
    label: 'Teaching',
    icon: '🎓',
    color: 'bg-pink-100 text-pink-700',
    seoTitle: 'Teaching Jobs 2026 — CTET, KVS, NVS, DSSSB Recruitment',
    seoDescription: 'Latest teaching job notifications 2026. CTET, KVS PRT/TGT/PGT, NVS, DSSSB teacher recruitment with eligibility and apply links.',
  },
  'police': {
    label: 'Police',
    icon: '👮',
    color: 'bg-cyan-100 text-cyan-700',
    seoTitle: 'Police Jobs 2026 — Constable, SI, CAPF, BSF, CRPF Recruitment',
    seoDescription: 'Latest police and paramilitary job notifications 2026. SSC GD Constable, Delhi Police, BSF, CISF, CRPF, ITBP recruitment.',
  },
  'state-govt': {
    label: 'State Govt',
    icon: '🏛️',
    color: 'bg-teal-100 text-teal-700',
    seoTitle: 'State Govt Jobs 2026 — UPPSC, BPSC, MPPSC, RPSC, TNPSC',
    seoDescription: 'Latest state government job notifications 2026. UPPSC, BPSC, MPPSC, RPSC, TNPSC, KPSC recruitment with eligibility and apply links.',
  },
};

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'deadline', label: 'Deadline soon' },
  { value: 'vacancies', label: 'Most vacancies' },
  { value: 'salary', label: 'Highest salary' },
  { value: 'popular', label: 'Most viewed' },
];

function formatDeadline(deadline: string | null): { text: string; urgent: boolean } | null {
  if (!deadline) return null;
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: 'Expired', urgent: false };
  if (days === 0) return { text: 'Last day!', urgent: true };
  if (days <= 7) return { text: `${days} days left`, urgent: true };
  return { text: `${days} days left`, urgent: false };
}

export default function JobsPage() {
  // category from URL param (when accessed via /jobs/category/:cat)
  const params = useParams<{ category?: string }>();
  const categoryParam = params.category || '';

  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState(categoryParam);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('latest');
  const [showFilters, setShowFilters] = useState(false);
  const [deadlineWithin, setDeadlineWithin] = useState<string>('');
  const [salaryMin, setSalaryMin] = useState<string>('');
  const [qualification, setQualification] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAlertModal, setShowAlertModal] = useState(false);

  // Sync category from URL params when route changes
  useEffect(() => {
    setActiveCategory(categoryParam);
    setPage(1);
  }, [categoryParam]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, per_page: 20, sort };
      if (activeCategory) params.category = activeCategory;
      if (search) params.search = search;
      if (deadlineWithin) params.deadline_within_days = deadlineWithin;
      if (salaryMin) params.salary_min = salaryMin;
      if (qualification) params.qualification = qualification;
      const res = await apiClient.get('/jobs', { params });
      setJobs(res.data.data);
      setTotal(res.data.meta.total);
    } catch {
      // silent
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
  }, [page, activeCategory, sort]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchJobs();
  };

  const handleApplyFilters = () => {
    setPage(1);
    fetchJobs();
  };

  const totalPages = Math.ceil(total / 20);

  // SEO meta — varies by category
  const meta = activeCategory && CATEGORY_LABELS[activeCategory] ? CATEGORY_LABELS[activeCategory] : null;
  const pageTitle = meta ? `${meta.seoTitle} | ExamPrep` : 'Govt Jobs & Tech Jobs 2026 — Latest Notifications | ExamPrep';
  const pageDescription = meta?.seoDescription || 'Latest govt jobs 2026 — SSC, UPSC, IBPS PO, Railway, Banking, PSU notifications. Plus remote tech jobs. Updated daily.';
  const heroLabel = meta ? meta.label : 'Govt & Tech Jobs';
  const canonicalUrl = activeCategory ? `https://zencodio.com/jobs/category/${activeCategory}` : 'https://zencodio.com/jobs';

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
              Latest{' '}
              <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                {heroLabel}
              </span>
            </h1>
            <p className="mt-4 text-base text-gray-600 dark:text-gray-400 sm:text-lg">
              {meta ? pageDescription : 'SSC, UPSC, IBPS, Railway, Banking notifications + remote tech jobs. Updated daily.'}
            </p>

            <form onSubmit={handleSearch} className="mx-auto mt-6 flex max-w-md gap-2 sm:mt-8">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jobs by title, company..."
                className="input flex-1"
              />
              <button type="submit" className="btn-primary">Search</button>
            </form>

            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => setShowAlertModal(true)}
                className="text-sm font-medium text-primary-600 hover:underline"
              >
                🔔 Get free job alerts
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Category chips */}
      <section className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/jobs"
              onClick={() => { setActiveCategory(''); setPage(1); }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activeCategory === ''
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              All ({total})
            </Link>
            {categories.map((c) => {
              const meta = CATEGORY_LABELS[c.category] || { label: c.category, icon: '📌', color: '' };
              return (
                <Link
                  key={c.category}
                  to={`/jobs/category/${c.category}`}
                  onClick={() => { setActiveCategory(c.category); setPage(1); }}
                  className={`flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    activeCategory === c.category
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  <span>{meta.icon}</span>
                  <span>{meta.label} ({c.count})</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Toolbar: sort + filters */}
      <section className="bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {total > 0 ? `${total} jobs found` : 'No jobs match'}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                {showFilters ? '✕ Hide filters' : '⚙ Filters'}
              </button>
              <select
                value={sort}
                onChange={(e) => { setSort(e.target.value); setPage(1); }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>Sort: {o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Deadline within</label>
                  <select
                    value={deadlineWithin}
                    onChange={(e) => setDeadlineWithin(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  >
                    <option value="">Any time</option>
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Min salary (₹)</label>
                  <input
                    type="number"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                    placeholder="e.g. 30000"
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Qualification</label>
                  <select
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  >
                    <option value="">Any</option>
                    <option value="10th">10th pass</option>
                    <option value="12th">12th pass</option>
                    <option value="graduate">Graduate</option>
                    <option value="iti">ITI</option>
                    <option value="btech">BE/BTech</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => { setDeadlineWithin(''); setSalaryMin(''); setQualification(''); setPage(1); fetchJobs(); }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  Clear
                </button>
                <button onClick={handleApplyFilters} className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700">
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Job list */}
      <section className="bg-gray-50 py-8 dark:bg-gray-900">
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

      {showAlertModal && <AlertSubscribeModal onClose={() => setShowAlertModal(false)} defaultCategory={activeCategory} />}
    </>
  );
}


function AlertSubscribeModal({ onClose, defaultCategory }: { onClose: () => void; defaultCategory: string }) {
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [frequency, setFrequency] = useState('daily');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      await apiClient.post('/jobs/alerts/subscribe', {
        email,
        category: category || null,
        frequency,
        channel: 'email',
      });
      toast.success('Subscribed! Check your inbox to confirm.');
      onClose();
    } catch {
      toast.error('Subscription failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">🔔 Get Free Job Alerts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <p className="mt-1 text-sm text-gray-500">Get the latest jobs delivered to your inbox.</p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="">All categories</option>
              <option value="ssc">SSC</option>
              <option value="upsc">UPSC</option>
              <option value="banking">Banking</option>
              <option value="railway">Railway</option>
              <option value="defense">Defence</option>
              <option value="psu">PSU</option>
              <option value="teaching">Teaching</option>
              <option value="police">Police</option>
              <option value="tech">Tech / IT</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? 'Subscribing...' : 'Subscribe'}
          </button>
          <p className="text-center text-[11px] text-gray-400">You'll receive a confirmation email. Unsubscribe anytime.</p>
        </form>
      </div>
    </div>
  );
}
