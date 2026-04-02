import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import apiClient from '@/lib/api/client';
import toast from 'react-hot-toast';

interface IQ { id: string; question: string; answer: string; category: string; topic: string; difficulty: string; tags: string[]; companies: string[]; is_bookmarked: boolean; is_practiced: boolean; }
interface TopicInfo { category: string; topic: string; question_count: number; }

const CAT_LABEL: Record<string, string> = { technical: 'Technical', hr_behavioral: 'HR & Behavioral', domain_specific: 'Domain Specific' };

function renderMarkdown(md: string): string {
  return md
    .replace(/```[\w]*\n([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto text-sm my-4"><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">$1</code>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-gray-900 dark:text-white mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary-600 hover:underline dark:text-primary-400" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-gray-700 dark:text-gray-300">$1</li>')
    .replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul class="space-y-1 my-3">$1</ul>')
    .replace(/^(?!<[a-z])((?!^\s*$).+)$/gm, '<p class="text-gray-700 leading-relaxed dark:text-gray-300 my-2">$1</p>');
}

export default function InterviewPrepPage() {
  const [questions, setQuestions] = useState<IQ[]>([]);
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedDiff, setSelectedDiff] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ bookmarked: 0, practiced: 0 });

  useEffect(() => {
    apiClient.get('/interview/my/stats').then(r => setStats(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    apiClient.get('/interview/topics', { params: selectedCat ? { category: selectedCat } : {} }).then(r => setTopics(r.data.data)).catch(() => {});
  }, [selectedCat]);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, any> = { page, per_page: 20 };
    if (selectedCat) params.category = selectedCat;
    if (selectedTopic) params.topic = selectedTopic;
    if (selectedDiff) params.difficulty = selectedDiff;
    apiClient.get('/interview/my/questions', { params }).then(r => {
      setQuestions(r.data.data);
      setTotal(r.data.meta.total);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [selectedCat, selectedTopic, selectedDiff, page]);

  const toggleBookmark = async (id: string) => {
    try {
      const res = await apiClient.post(`/interview/my/bookmark/${id}`);
      const bookmarked = res.data.data.bookmarked;
      setQuestions(qs => qs.map(q => q.id === id ? { ...q, is_bookmarked: bookmarked } : q));
      setStats(s => ({ ...s, bookmarked: s.bookmarked + (bookmarked ? 1 : -1) }));
      toast.success(bookmarked ? 'Bookmarked' : 'Removed bookmark');
    } catch { toast.error('Failed'); }
  };

  const togglePracticed = async (id: string) => {
    try {
      const res = await apiClient.post(`/interview/my/practiced/${id}`);
      const practiced = res.data.data.practiced;
      setQuestions(qs => qs.map(q => q.id === id ? { ...q, is_practiced: practiced } : q));
      setStats(s => ({ ...s, practiced: s.practiced + (practiced ? 1 : -1) }));
    } catch { toast.error('Failed'); }
  };

  const diffBadge = (d: string) => {
    const c = d === 'easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : d === 'hard' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${c}`}>{d}</span>;
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <Helmet><title>Interview Prep | ExamPrep</title></Helmet>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Interview Prep</h1>
          <p className="mt-1 text-sm text-gray-500">{total} questions available</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-400">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>
            {stats.bookmarked} saved
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            {stats.practiced} practiced
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center gap-3">
          {/* Category */}
          <select value={selectedCat} onChange={e => { setSelectedCat(e.target.value); setSelectedTopic(''); setPage(1); }} className="input w-auto">
            <option value="">All Categories</option>
            {Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          {/* Difficulty */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-800">
            {['', 'easy', 'medium', 'hard'].map(d => (
              <button
                key={d}
                onClick={() => { setSelectedDiff(d); setPage(1); }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${selectedDiff === d ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
              >
                {d === '' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>

          {/* Clear */}
          {(selectedCat || selectedTopic || selectedDiff) && (
            <button onClick={() => { setSelectedCat(''); setSelectedTopic(''); setSelectedDiff(''); setPage(1); }} className="text-xs font-medium text-red-500 hover:text-red-700">
              Clear filters
            </button>
          )}

          {/* Results count */}
          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
            {loading ? 'Loading...' : `${total} result${total !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Topic chips */}
        {topics.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
            <button onClick={() => { setSelectedTopic(''); setPage(1); }} className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${!selectedTopic ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'}`}>All Topics</button>
            {topics.map(t => (
              <button key={t.topic} onClick={() => { setSelectedTopic(t.topic); setPage(1); }} className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${selectedTopic === t.topic ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'}`}>
                {t.topic} <span className="opacity-60">({t.question_count})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="mt-5 space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-3 h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))
        ) : questions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
            <svg className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            <p className="mt-4 text-gray-500 dark:text-gray-400">No interview questions found. Try a different filter or check back later.</p>
          </div>
        ) : questions.map(q => {
          const isExpanded = expandedId === q.id;
          return (
            <div key={q.id} className={`overflow-hidden rounded-xl border transition-shadow ${isExpanded ? 'border-primary-300 shadow-lg dark:border-primary-700' : 'border-gray-200 hover:shadow-md dark:border-gray-800'} bg-white dark:bg-gray-900`}>
              {/* Question header */}
              <div className="flex items-start gap-3 p-5">
                <button onClick={() => setExpandedId(isExpanded ? null : q.id)} className="flex-1 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">{q.topic}</span>
                    {diffBadge(q.difficulty)}
                    {q.companies?.slice(0, 3).map(c => (
                      <span key={c} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">{c}</span>
                    ))}
                    {q.is_practiced && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">Practiced</span>
                    )}
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{q.question}</h3>
                </button>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2 pt-1">
                  <button onClick={() => toggleBookmark(q.id)} title={q.is_bookmarked ? 'Remove bookmark' : 'Bookmark'} className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <svg className={`h-5 w-5 ${q.is_bookmarked ? 'fill-primary-500 text-primary-500' : 'text-gray-400 hover:text-primary-500'}`} viewBox="0 0 20 20" fill={q.is_bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5}><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>
                  </button>
                  <button onClick={() => togglePracticed(q.id)} title="Mark as practiced" className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <svg className={`h-5 w-5 ${q.is_practiced ? 'text-green-500' : 'text-gray-400 hover:text-green-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </button>
                  <button onClick={() => setExpandedId(isExpanded ? null : q.id)} className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <svg className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>
              </div>

              {/* Answer */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50 px-5 py-5 dark:border-gray-800 dark:bg-gray-800/50">
                  <div className="prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(q.answer) }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let p: number;
            if (totalPages <= 5) p = i + 1;
            else if (page <= 3) p = i + 1;
            else if (page >= totalPages - 2) p = totalPages - 4 + i;
            else p = page - 2 + i;
            return (
              <button key={p} onClick={() => setPage(p)} className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${page === p ? 'bg-primary-600 text-white' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>
                {p}
              </button>
            );
          })}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      )}
    </>
  );
}
