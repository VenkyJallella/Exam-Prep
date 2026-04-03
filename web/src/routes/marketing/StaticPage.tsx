import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useLocation } from 'react-router-dom';
import apiClient from '../../lib/api/client';

function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary-600 hover:underline">$1</a>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-gray-700 dark:text-gray-300">$1</li>')
    .replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul class="space-y-1 my-4">$1</ul>')
    .replace(/^(?!<[a-z])((?!^\s*$).+)$/gm, '<p class="text-gray-700 leading-relaxed dark:text-gray-300 my-3">$1</p>');
}

export default function StaticPage() {
  const { slug: paramSlug } = useParams<{ slug: string }>();
  const location = useLocation();
  // Derive slug from URL path if not in params (e.g., /terms → "terms")
  const slug = paramSlug || location.pathname.replace('/', '');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    apiClient.get(`/pages/${slug}`)
      .then(r => { setTitle(r.data.data.title); setContent(r.data.data.content); })
      .catch(() => { setTitle('Page Not Found'); setContent('The requested page could not be found.'); })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" /></div>;

  return (
    <>
      <Helmet>
        <title>{title} | ExamPrep</title>
        <meta name="description" content={`${title} for ExamPrep — India's AI-powered competitive exam preparation platform. Read our ${title?.toLowerCase()}.`} />
        <link rel="canonical" href={`https://zencodio.com/${slug}`} />
        <meta property="og:title" content={`${title} | ExamPrep`} />
        <meta property="og:description" content={`${title} for ExamPrep exam preparation platform.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://zencodio.com/${slug}`} />
      </Helmet>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
      </div>
    </>
  );
}
