import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link, useLocation } from 'react-router-dom';
import apiClient from '../../lib/api/client';
import AdBanner from '../../components/ui/AdBanner';

interface BlogPostDetail {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  meta_description: string;
  meta_keywords: string[];
  tags: string[];
  featured_image_url: string | null;
  reading_time_minutes: number;
  published_at: string | null;
  view_count: number;
  is_ai_generated: boolean;
  created_at: string;
}

/**
 * Simple markdown-to-HTML converter for blog content.
 * Handles headings, bold, italic, links, lists, paragraphs, and code blocks.
 */
function renderMarkdown(md: string): string {
  let html = md
    // Code blocks
    .replace(/```[\w]*\n([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto text-sm my-4 border"><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    // Images: ![alt](url)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-lg my-4 max-w-full h-auto shadow-sm" loading="lazy" />')
    // H4
    .replace(/^#### (.+)$/gm, '<h4 class="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-2">$1</h4>')
    // H3
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">$1</h3>')
    // H2
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">$1</h2>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-primary-500 pl-4 my-4 text-gray-600 dark:text-gray-400 italic">$1</blockquote>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="my-6 border-gray-200 dark:border-gray-700" />')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary-600 hover:underline dark:text-primary-400" target="_blank" rel="noopener noreferrer">$1</a>')
    // Numbered list items
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-gray-700 dark:text-gray-300">$1</li>')
    // Unordered list items
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-gray-700 dark:text-gray-300">$1</li>')
    // Wrap consecutive <li> in <ul>/<ol>
    .replace(/((?:<li class="ml-4 list-decimal[^>]*>.*<\/li>\n?)+)/g, '<ol class="space-y-1 my-4 pl-4">$1</ol>')
    .replace(/((?:<li class="ml-4 list-disc[^>]*>.*<\/li>\n?)+)/g, '<ul class="space-y-1 my-4">$1</ul>');

  // Tables: | col1 | col2 |
  html = html.replace(/(?:^|\n)((?:\|[^\n]+\|\n)+)/g, (match) => {
    const rows = match.trim().split('\n').filter(r => r.trim() && !r.match(/^\|[\s\-|]+\|$/));
    if (rows.length === 0) return match;
    let table = '<div class="overflow-x-auto my-6"><table class="w-full text-sm border-collapse border border-gray-200 dark:border-gray-700">';
    rows.forEach((row, i) => {
      const cells = row.split('|').filter(c => c.trim());
      const tag = i === 0 ? 'th' : 'td';
      const cellClass = i === 0
        ? 'bg-gray-50 dark:bg-gray-800 font-semibold text-gray-900 dark:text-white px-4 py-2 border border-gray-200 dark:border-gray-700'
        : 'px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300';
      table += '<tr>' + cells.map(c => `<${tag} class="${cellClass}">${c.trim()}</${tag}>`).join('') + '</tr>';
    });
    table += '</table></div>';
    return table;
  });

  // Paragraphs (lines that aren't already HTML)
  html = html.replace(/^(?!<[a-z/<])((?!^\s*$).+)$/gm, '<p class="text-gray-700 leading-relaxed dark:text-gray-300 my-3">$1</p>');

  return html;
}

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const blogBase = location.pathname.startsWith('/dashboard') ? '/dashboard/blog' : '/blog';
  const [post, setPost] = useState<BlogPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    apiClient
      .get(`/blog/${slug}`)
      .then((res) => setPost(res.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="mt-8 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-4 w-full rounded bg-gray-200 dark:bg-gray-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Article Not Found</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          This article may have been removed or the link is incorrect.
        </p>
        <Link to={blogBase} className="btn-primary mt-6 inline-block text-sm">
          Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{post.title} | ExamPrep Blog</title>
        <meta name="description" content={post.meta_description} />
        {post.meta_keywords.length > 0 && (
          <meta name="keywords" content={post.meta_keywords.join(', ')} />
        )}
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.meta_description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://zencodio.com/blog/${post.slug}`} />
        <meta property="og:image" content={post.featured_image_url || 'https://zencodio.com/og-image.png'} />
        {post.published_at && (
          <meta property="article:published_time" content={post.published_at} />
        )}
        {post.tags.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
        <link rel="canonical" href={`https://zencodio.com/blog/${post.slug}`} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": post.title,
          "description": post.meta_description,
          "datePublished": post.published_at,
          "dateModified": post.created_at,
          "author": {"@type": "Organization", "name": "ExamPrep"},
          "publisher": {"@type": "Organization", "name": "ExamPrep", "logo": {"@type": "ImageObject", "url": "https://zencodio.com/favicon.svg"}},
          "mainEntityOfPage": {"@type": "WebPage", "@id": `https://zencodio.com/blog/${post.slug}`},
          "keywords": post.meta_keywords.join(', '),
          "wordCount": post.content.split(' ').length,
          "articleSection": post.tags[0] || "Education",
        })}</script>
      </Helmet>

      <article className="bg-white dark:bg-gray-950">
        {/* Header */}
        <header className="bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
            <Link
              to={blogBase}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Blog
            </Link>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {post.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              {post.published_at && (
                <span>
                  {new Date(post.published_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              )}
              <span>·</span>
              <span>{post.reading_time_minutes} min read</span>
              <span>·</span>
              <span>{post.view_count.toLocaleString()} views</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  to={`${blogBase}?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-400"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        </header>

        {/* Featured image */}
        {post.featured_image_url && (
          <div className="mx-auto max-w-4xl px-4">
            <img
              src={post.featured_image_url}
              alt={post.title}
              className="w-full rounded-xl object-cover shadow-lg"
            />
          </div>
        )}

        {/* Content */}
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <div
            className="prose-custom"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
          />

          {/* Ad after blog content */}
          <div className="my-8">
            <AdBanner publicOnly format="horizontal" />
          </div>
        </div>

        {/* CTA */}
        <section className="border-t border-gray-200 bg-gray-50 py-12 dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Ready to Start Preparing?
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Join thousands of aspirants using AI-powered practice to crack their exams.
            </p>
            <Link to="/register" className="btn-primary mt-6 inline-block text-sm">
              Start Free Practice
            </Link>
          </div>
        </section>
      </article>
    </>
  );
}
