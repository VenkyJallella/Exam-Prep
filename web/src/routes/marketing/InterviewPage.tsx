import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import apiClient from '../../lib/api/client';

interface IQ { id: string; question: string; answer: string; category: string; topic: string; difficulty: string; tags: string[]; companies: string[]; }
interface CatSummary { category: string; topic_count: number; question_count: number; }
interface TopicInfo { category: string; topic: string; question_count: number; }

const CAT_LABEL: Record<string, string> = { technical: 'Technical', hr_behavioral: 'HR & Behavioral', domain_specific: 'Domain Specific' };
const CAT_ICON: Record<string, string> = {
  technical: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
  hr_behavioral: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  domain_specific: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
};

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

const FREE_LIMIT = 5;

export default function InterviewPage() {
  const [categories, setCategories] = useState<CatSummary[]>([]);
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [questions, setQuestions] = useState<IQ[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedDiff, setSelectedDiff] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    apiClient.get('/interview').then(r => setCategories(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    apiClient.get('/interview/topics', { params: selectedCat ? { category: selectedCat } : {} })
      .then(r => setTopics(r.data.data)).catch(() => {});
  }, [selectedCat]);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, any> = { page, per_page: 20 };
    if (selectedCat) params.category = selectedCat;
    if (selectedTopic) params.topic = selectedTopic;
    if (selectedDiff) params.difficulty = selectedDiff;
    apiClient.get('/interview/questions', { params }).then(r => {
      setQuestions(r.data.data);
      setTotal(r.data.meta.total);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [selectedCat, selectedTopic, selectedDiff, page]);

  const diffBadge = (d: string) => {
    const c = d === 'easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : d === 'hard' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${c}`}>{d}</span>;
  };

  const totalQuestions = categories.reduce((s, c) => s + c.question_count, 0);
  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <Helmet>
        <title>Interview Preparation - Technical & HR Questions with Answers | ExamPrep</title>
        <meta name="description" content="Practice top interview questions for Java, Python, React, SQL, System Design, HR and more. Detailed answers with code examples. Free interview prep." />
        <meta property="og:title" content="Interview Preparation - Technical & HR Questions | ExamPrep" />
        <meta property="og:description" content="Master your next interview with expert Q&A for Technical, HR, and Domain-specific topics." />
      </Helmet>

      {/* Hero — compact */}
      <section className="border-b border-gray-200 bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:border-gray-800 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Interview <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">Preparation</span>
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {totalQuestions > 0 ? `${totalQuestions} questions` : 'Expert Q&A'} across Technical, HR, and Domain-specific topics.
          </p>
        </div>
      </section>

      {/* Main layout: sidebar + content */}
      <section className="bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto flex max-w-7xl gap-0 lg:gap-6 px-4 py-8 sm:px-6 lg:px-8">

          {/* Left sidebar — filters */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-20 space-y-5">
              {/* Categories */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Category</h3>
                <div className="mt-3 space-y-1">
                  <button onClick={() => { setSelectedCat(''); setSelectedTopic(''); setPage(1); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${!selectedCat ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}>
                    All Categories
                    <span className="ml-auto text-xs text-gray-400">{totalQuestions}</span>
                  </button>
                  {(['technical', 'hr_behavioral', 'domain_specific'] as const).map(cat => {
                    const info = categories.find(c => c.category === cat);
                    const isActive = selectedCat === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => { setSelectedCat(isActive ? '' : cat); setSelectedTopic(''); setPage(1); setExpandedId(null); }}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                      >
                        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={CAT_ICON[cat]} /></svg>
                        {CAT_LABEL[cat]}
                        {info && <span className="ml-auto text-xs text-gray-400">{info.question_count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Difficulty */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Difficulty</h3>
                <div className="mt-3 space-y-1">
                  {[{ val: '', label: 'All Levels' }, { val: 'easy', label: 'Easy' }, { val: 'medium', label: 'Medium' }, { val: 'hard', label: 'Hard' }].map(d => (
                    <button key={d.val} onClick={() => { setSelectedDiff(d.val); setPage(1); }}
                      className={`flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${selectedDiff === d.val ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                    >
                      {d.val && <span className={`mr-2 h-2 w-2 rounded-full ${d.val === 'easy' ? 'bg-green-500' : d.val === 'hard' ? 'bg-red-500' : 'bg-yellow-500'}`} />}
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topics */}
              {topics.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Topics</h3>
                  <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
                    <button onClick={() => { setSelectedTopic(''); setPage(1); }} className={`flex w-full items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${!selectedTopic ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}>
                      All Topics
                    </button>
                    {topics.map(t => (
                      <button key={t.topic} onClick={() => { setSelectedTopic(t.topic); setPage(1); }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${selectedTopic === t.topic ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                      >
                        <span className="truncate">{t.topic}</span>
                        <span className="ml-1 shrink-0 text-xs text-gray-400">{t.question_count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Clear filters */}
              {(selectedCat || selectedTopic || selectedDiff) && (
                <button onClick={() => { setSelectedCat(''); setSelectedTopic(''); setSelectedDiff(''); setPage(1); }} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-white dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800">
                  Clear all filters
                </button>
              )}
            </div>
          </aside>

          {/* Mobile filters (shown below hero on small screens) */}
          <div className="mb-4 flex flex-wrap gap-2 lg:hidden">
            <select value={selectedCat} onChange={e => { setSelectedCat(e.target.value); setSelectedTopic(''); setPage(1); }} className="input w-auto text-sm">
              <option value="">All Categories</option>
              {Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={selectedDiff} onChange={e => { setSelectedDiff(e.target.value); setPage(1); }} className="input w-auto text-sm">
              <option value="">All Levels</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            {topics.length > 0 && (
              <select value={selectedTopic} onChange={e => { setSelectedTopic(e.target.value); setPage(1); }} className="input w-auto text-sm">
                <option value="">All Topics</option>
                {topics.map(t => <option key={t.topic} value={t.topic}>{t.topic} ({t.question_count})</option>)}
              </select>
            )}
          </div>

          {/* Right — questions */}
          <div className="min-w-0 flex-1">
            {/* Results bar */}
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {loading ? 'Loading...' : `${total} question${total !== 1 ? 's' : ''}`}
                {selectedCat && <> in <span className="font-medium text-gray-700 dark:text-gray-300">{CAT_LABEL[selectedCat]}</span></>}
                {selectedTopic && <> &middot; <span className="font-medium text-gray-700 dark:text-gray-300">{selectedTopic}</span></>}
              </span>
              {totalPages > 1 && <span className="text-xs text-gray-400">Page {page}/{totalPages}</span>}
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl bg-white p-6 dark:bg-gray-950">
                    <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
                    <div className="mt-3 h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-800" />
                  </div>
                ))}
              </div>
            ) : questions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-950">
                <svg className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                <p className="mt-4 text-gray-500 dark:text-gray-400">
                  {selectedCat || selectedTopic || selectedDiff ? 'No questions match your filters.' : 'No questions available yet. Check back soon!'}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {questions.map((q, idx) => {
                    const locked = idx >= FREE_LIMIT;
                    const isExpanded = expandedId === q.id && !locked;
                    return (
                      <div key={q.id} className={`overflow-hidden rounded-xl border bg-white transition-shadow dark:bg-gray-950 ${locked ? 'border-gray-200 dark:border-gray-800 opacity-50' : isExpanded ? 'border-primary-300 shadow-lg dark:border-primary-700' : 'border-gray-200 hover:shadow-md dark:border-gray-800'}`}>
                        <button
                          onClick={() => !locked && setExpandedId(isExpanded ? null : q.id)}
                          className="flex w-full items-start justify-between p-5 text-left"
                        >
                          <div className="flex-1 pr-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="rounded bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">{q.topic}</span>
                              {diffBadge(q.difficulty)}
                              {q.companies?.slice(0, 2).map(c => (
                                <span key={c} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">{c}</span>
                              ))}
                            </div>
                            <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{q.question}</h3>
                          </div>
                          {locked ? (
                            <svg className="mt-2 h-5 w-5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          ) : (
                            <svg className={`mt-2 h-5 w-5 shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                          )}
                        </button>

                        {isExpanded && (
                          <div className="border-t border-gray-100 bg-gray-50 px-5 py-5 dark:border-gray-800 dark:bg-gray-900/50">
                            <div className="prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(q.answer) }} />
                          </div>
                        )}

                        {locked && idx === FREE_LIMIT && (
                          <div className="border-t border-gray-100 bg-gradient-to-b from-white to-primary-50 px-5 py-8 text-center dark:border-gray-800 dark:from-gray-950 dark:to-primary-950/20">
                            <svg className="mx-auto h-8 w-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            <p className="mt-3 text-base font-semibold text-gray-900 dark:text-white">Sign up to unlock all {total} questions</p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Free account — no credit card required</p>
                            <Link to="/register" className="btn-primary mt-4 inline-block text-sm">Sign Up Free</Link>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-1">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let p: number;
                      if (totalPages <= 5) p = i + 1;
                      else if (page <= 3) p = i + 1;
                      else if (page >= totalPages - 2) p = totalPages - 4 + i;
                      else p = page - 2 + i;
                      return (
                        <button key={p} onClick={() => setPage(p)} className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${page === p ? 'bg-primary-600 text-white' : 'text-gray-700 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800'}`}>{p}</button>
                      );
                    })}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* SEO content */}
      <section className="bg-white py-12 dark:bg-gray-950">
        <div className="mx-auto max-w-3xl px-4 text-sm leading-relaxed text-gray-500 dark:text-gray-400 sm:px-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Interview Preparation by ExamPrep</h2>
          <p className="mt-2">
            Prepare for your next job interview with our comprehensive collection of interview questions and detailed answers.
            We cover technical interviews (Java, Python, JavaScript, React, SQL, System Design, DSA), HR and behavioral rounds,
            and domain-specific topics. Each question comes with a detailed, well-structured answer including code examples where relevant.
          </p>
          <p className="mt-2">
            Whether you are a fresher preparing for campus placements or an experienced professional switching companies,
            our interview preparation section has questions for all experience levels. New questions are added regularly by our expert team and AI.
          </p>
        </div>
      </section>
    </>
  );
}
