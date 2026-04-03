import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation } from 'react-router-dom';
import apiClient from '../../lib/api/client';
import AdBanner from '../../components/ui/AdBanner';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  tags: string[];
  featured_image_url: string | null;
  reading_time_minutes: number;
  published_at: string | null;
  view_count: number;
}

export default function BlogListPage() {
  const location = useLocation();
  const blogBase = location.pathname.startsWith('/dashboard') ? '/dashboard/blog' : '/blog';
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, per_page: 12 };
      if (search) params.search = search;
      if (activeTag) params.tag = activeTag;
      const res = await apiClient.get('/blog', { params });
      setPosts(res.data.data);
      setTotal(res.data.meta.total);
    } catch {
      // silently fail for public page
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [page, activeTag]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPosts();
  };

  const totalPages = Math.ceil(total / 12);

  // Collect unique tags from current posts for filter chips
  const allTags = [...new Set(posts.flatMap((p) => p.tags))].slice(0, 8);

  return (
    <>
      <Helmet>
        <title>Blog - Exam Preparation Tips & Strategies | ExamPrep</title>
        <meta
          name="description"
          content="Read expert tips, strategies, and insights for UPSC, JEE, SSC, Banking exam preparation. AI-powered, SEO-optimised articles for Indian aspirants."
        />
        <meta property="og:title" content="ExamPrep Blog - Exam Preparation Tips & Strategies" />
        <meta
          property="og:description"
          content="Expert tips and strategies for competitive exam preparation in India."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://zencodio.com/blog" />
        <meta property="og:image" content="https://zencodio.com/og-image.png" />
        <link rel="canonical" href="https://zencodio.com/blog" />
      </Helmet>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
              ExamPrep{' '}
              <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                Blog
              </span>
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Tips, strategies, and insights to help you crack your competitive exam.
            </p>

            {/* Search */}
            <form onSubmit={handleSearch} className="mx-auto mt-8 flex max-w-md gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search articles..."
                className="input flex-1"
              />
              <button type="submit" className="btn-primary text-sm">
                Search
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Tags filter */}
      {allTags.length > 0 && (
        <section className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
            <button
              onClick={() => {
                setActiveTag('');
                setPage(1);
              }}
              className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                !activeTag
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setActiveTag(tag);
                  setPage(1);
                }}
                className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  activeTag === tag
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Posts grid */}
      <section className="bg-gray-50 py-12 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl bg-white p-6 dark:bg-gray-950">
                  <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="mt-3 h-3 w-full rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="mt-2 h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-800" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-lg text-gray-500 dark:text-gray-400">
                No articles found. Check back soon for new content!
              </p>
            </div>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to={`${blogBase}/${post.slug}`}
                  className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-lg dark:border-gray-800 dark:bg-gray-950"
                >
                  {post.featured_image_url && (
                    <img
                      src={post.featured_image_url}
                      alt={post.title}
                      className="h-48 w-full object-cover"
                    />
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      {post.published_at && (
                        <span>{new Date(post.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      )}
                      <span>·</span>
                      <span>{post.reading_time_minutes} min read</span>
                    </div>
                    <h2 className="mt-2 text-lg font-bold text-gray-900 transition-colors group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400">
                      {post.title}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                      {post.excerpt}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Ad between posts and SEO content */}
          <div className="my-8"><AdBanner publicOnly format="horizontal" /></div>

          {/* SEO static content — always visible for Google crawlers */}
          <div className="mt-12 mx-auto max-w-3xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Exam Preparation Blog by ExamPrep</h2>
            <p className="mt-2">
              Welcome to the ExamPrep blog — your go-to resource for competitive exam preparation tips, strategies, and study guides.
              We cover UPSC Civil Services, JEE Main & Advanced, NEET, SSC CGL, Banking (IBPS PO, SBI PO), GATE Computer Science,
              CAT, and coding interview preparation. Our articles are written by education experts and AI, covering topics like
              study plans, time management, subject-wise strategies, previous year paper analysis, and exam notifications.
            </p>
            <p className="mt-2">
              Whether you are a first-time aspirant or a repeat candidate, our blog helps you stay updated with the latest exam
              patterns, cut-off trends, and preparation methodologies. New articles are published regularly with actionable tips
              you can apply immediately to improve your scores.
            </p>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary text-sm disabled:opacity-50"
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
