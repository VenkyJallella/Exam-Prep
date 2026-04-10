import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../../lib/api/client';

interface Job {
  id: string;
  title: string;
  slug: string;
  company: string | null;
  category: string;
  short_description: string;
  description: string;
  eligibility: string | null;
  location: string | null;
  is_remote: boolean;
  salary_text: string | null;
  salary_min: number | null;
  salary_max: number | null;
  vacancies: number | null;
  apply_url: string;
  apply_deadline: string | null;
  posted_date: string | null;
  tags: string[];
  source: string;
  view_count: number;
  meta_description: string | null;
}

export default function JobDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    apiClient.get(`/jobs/${slug}`)
      .then((res) => setJob(res.data.data))
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleApply = async () => {
    if (!job) return;
    try {
      apiClient.post(`/jobs/${job.slug}/click`).catch(() => {});
    } catch {
      // ignore
    }
    window.open(job.apply_url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Job not found</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          This posting may have expired or been removed.
        </p>
        <Link to="/jobs" className="mt-6 inline-block text-primary-600 hover:underline">
          ← Back to all jobs
        </Link>
      </div>
    );
  }

  const deadlineDate = job.apply_deadline ? new Date(job.apply_deadline) : null;
  const daysLeft = deadlineDate
    ? Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <>
      <Helmet>
        <title>{job.title} — Apply Online | ExamPrep Jobs</title>
        <meta name="description" content={job.meta_description || job.short_description} />
        <meta property="og:title" content={`${job.title} — Apply Online`} />
        <meta property="og:description" content={job.meta_description || job.short_description} />
        <meta property="og:type" content="article" />
        <link rel="canonical" href={`https://zencodio.com/jobs/${job.slug}`} />
        {/* JobPosting schema for Google Jobs */}
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'JobPosting',
          title: job.title,
          description: job.description,
          datePosted: job.posted_date,
          validThrough: job.apply_deadline,
          employmentType: 'FULL_TIME',
          hiringOrganization: {
            '@type': 'Organization',
            name: job.company || 'Government of India',
          },
          jobLocation: job.location ? {
            '@type': 'Place',
            address: { '@type': 'PostalAddress', addressLocality: job.location, addressCountry: 'IN' },
          } : undefined,
          baseSalary: job.salary_min ? {
            '@type': 'MonetaryAmount',
            currency: 'INR',
            value: { '@type': 'QuantitativeValue', minValue: job.salary_min, maxValue: job.salary_max, unitText: 'YEAR' },
          } : undefined,
          totalJobOpenings: job.vacancies || undefined,
          url: `https://zencodio.com/jobs/${job.slug}`,
        })}</script>
      </Helmet>

      <div className="bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Link to="/jobs" className="text-sm text-primary-600 hover:underline">← All Jobs</Link>

          {/* Header card */}
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 capitalize">
                {job.category.replace('-', ' ')}
              </span>
              {job.is_remote && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Remote</span>
              )}
              {daysLeft !== null && daysLeft >= 0 && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${daysLeft <= 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  ⏰ {daysLeft === 0 ? 'Last day!' : `${daysLeft} days left`}
                </span>
              )}
            </div>

            <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{job.title}</h1>
            {job.company && (
              <p className="mt-1 text-lg text-gray-600 dark:text-gray-400">{job.company}</p>
            )}

            {/* Quick stats */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {job.location && (
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                  <div className="text-xs text-gray-500">Location</div>
                  <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{job.location}</div>
                </div>
              )}
              {job.salary_text && (
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                  <div className="text-xs text-gray-500">Salary</div>
                  <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{job.salary_text}</div>
                </div>
              )}
              {job.vacancies && (
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                  <div className="text-xs text-gray-500">Vacancies</div>
                  <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{job.vacancies.toLocaleString()}</div>
                </div>
              )}
              {job.apply_deadline && (
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                  <div className="text-xs text-gray-500">Last Date</div>
                  <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(job.apply_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              )}
            </div>

            {/* Apply button */}
            <button
              onClick={handleApply}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:shadow-xl sm:w-auto"
            >
              Apply Now ↗
            </button>
          </div>

          {/* Description */}
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Job Description</h2>
            <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {job.description}
            </div>

            {job.eligibility && (
              <div className="mt-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Eligibility</h3>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  {job.eligibility}
                </div>
              </div>
            )}

            {job.tags && job.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {job.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Bottom apply CTA */}
          <div className="mt-6 rounded-2xl bg-gradient-to-r from-primary-600 to-accent-600 p-6 text-center">
            <h3 className="text-xl font-bold text-white">Ready to apply?</h3>
            <p className="mt-1 text-sm text-primary-100">Click below to go to the official application portal.</p>
            <button
              onClick={handleApply}
              className="mt-4 rounded-xl bg-white px-6 py-3 text-base font-semibold text-primary-700 shadow hover:bg-gray-50"
            >
              Apply on Official Site ↗
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
