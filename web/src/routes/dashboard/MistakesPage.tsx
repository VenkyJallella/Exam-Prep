import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import apiClient from '@/lib/api/client';
import toast from 'react-hot-toast';

interface Mistake {
  id: string;
  question_id: string;
  question_text: string;
  options: Record<string, string>;
  correct_answer: string[];
  explanation: string | null;
  topic_id: string | null;
  topic_name: string | null;
  difficulty: number;
  revision_count: number;
  last_revised_at: string | null;
  is_resolved: boolean;
  notes: string | null;
  created_at: string;
}

interface MistakeSummary {
  total: number;
  unresolved: number;
  resolved: number;
  weak_topics: { topic_id: string; topic_name: string; mistake_count: number }[];
}

export default function MistakesPage() {
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [summary, setSummary] = useState<MistakeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'difficulty' | 'revisions'>('recent');

  const loadData = () => {
    setLoading(true);
    const resolved = filter === 'all' ? undefined : filter === 'resolved';
    Promise.allSettled([
      apiClient.get('/mistakes', { params: { resolved } }).then((r) => setMistakes(r.data.data)),
      apiClient.get('/mistakes/summary').then((r) => setSummary(r.data.data)),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [filter]);

  const handleRevise = async (id: string) => {
    try {
      await apiClient.post(`/mistakes/${id}/revise`);
      toast.success('Marked as revised!');
      loadData();
    } catch { toast.error('Failed to mark as revised'); }
  };

  const handleResolve = async (id: string) => {
    try {
      await apiClient.post(`/mistakes/${id}/resolve`);
      toast.success('Mistake resolved!');
      loadData();
    } catch { toast.error('Failed to resolve'); }
  };

  const handleSaveNotes = async (id: string) => {
    try {
      await apiClient.patch(`/mistakes/${id}/notes`, { notes: noteText });
      toast.success('Notes saved');
      setEditingNotes(null);
      loadData();
    } catch { toast.error('Failed to save notes'); }
  };

  // Filter and sort
  const filteredMistakes = mistakes
    .filter((m) => {
      if (searchQuery && !m.question_text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedTopic && m.topic_name !== selectedTopic) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'difficulty') return b.difficulty - a.difficulty;
      if (sortBy === 'revisions') return a.revision_count - b.revision_count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const resolutionRate = summary ? (summary.total > 0 ? Math.round((summary.resolved / summary.total) * 100) : 0) : 0;
  const avgDifficulty = mistakes.length > 0 ? (mistakes.reduce((s, m) => s + m.difficulty, 0) / mistakes.length).toFixed(1) : '0';
  const needsRevision = mistakes.filter((m) => !m.is_resolved && m.revision_count < 3).length;

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" /></div>;
  }

  return (
    <>
      <Helmet>
        <title>Mistake Book - ExamPrep</title>
        <meta name="description" content="Review and learn from your mistakes. Track wrong answers and improve weak areas." />
      </Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mistake Book</h1>
            <p className="mt-1 text-sm text-gray-500">Review and revise questions you got wrong</p>
          </div>
          {needsRevision > 0 && (
            <Link to="/practice" className="btn-primary text-sm">
              Practice Weak Topics
            </Link>
          )}
        </div>

        {/* Stats row */}
        {summary && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="card text-center">
              <p className="text-3xl font-bold text-red-600">{summary.unresolved}</p>
              <p className="text-sm text-gray-500">Unresolved</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-green-600">{summary.resolved}</p>
              <p className="text-sm text-gray-500">Resolved</p>
            </div>
            <div className="card text-center">
              <div className="relative mx-auto h-14 w-14">
                <svg className="h-14 w-14 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" className="dark:stroke-gray-700" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke={resolutionRate >= 70 ? '#22c55e' : resolutionRate >= 40 ? '#eab308' : '#ef4444'} strokeWidth="8"
                    strokeDasharray={`${resolutionRate * 2.51} 251`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{resolutionRate}%</span>
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-500">Resolution Rate</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-orange-600">{needsRevision}</p>
              <p className="text-sm text-gray-500">Needs Revision</p>
              <p className="text-xs text-gray-400">revised &lt; 3 times</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-purple-600">{avgDifficulty}</p>
              <p className="text-sm text-gray-500">Avg Difficulty</p>
              <p className="text-xs text-gray-400">of wrong answers</p>
            </div>
          </div>
        )}

        {/* Weak topics with progress bars */}
        {summary && summary.weak_topics.length > 0 && (
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Weak Topics — Focus Areas</h3>
            <div className="space-y-3">
              {summary.weak_topics.slice(0, 8).map((t) => {
                const maxCount = summary.weak_topics[0]?.mistake_count || 1;
                return (
                  <div key={t.topic_id} className="cursor-pointer" onClick={() => setSelectedTopic(selectedTopic === t.topic_name ? null : t.topic_name)}>
                    <div className="flex items-center justify-between text-sm">
                      <span className={`font-medium ${selectedTopic === t.topic_name ? 'text-primary-600' : 'text-gray-700 dark:text-gray-300'}`}>
                        {t.topic_name}
                      </span>
                      <span className="text-red-600 font-semibold">{t.mistake_count} mistakes</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${(t.mistake_count / maxCount) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {selectedTopic && (
              <button onClick={() => setSelectedTopic(null)} className="mt-3 text-xs text-primary-600 hover:underline">
                Clear filter: {selectedTopic}
              </button>
            )}
          </div>
        )}

        {/* Filters and search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800 sm:w-auto">
            {(['unresolved', 'resolved', 'all'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-md px-4 py-2 text-sm font-medium capitalize transition-all ${filter === f ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
              >{f}</button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search mistakes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input flex-1 text-sm"
          />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="input w-40 text-sm">
            <option value="recent">Most Recent</option>
            <option value="difficulty">Hardest First</option>
            <option value="revisions">Least Revised</option>
          </select>
        </div>

        {/* Showing count */}
        <p className="text-xs text-gray-400">
          Showing {filteredMistakes.length} of {mistakes.length} mistakes
          {selectedTopic && <span> · Topic: <strong>{selectedTopic}</strong></span>}
        </p>

        {/* Mistakes list */}
        {filteredMistakes.length === 0 ? (
          <div className="card py-12 text-center">
            <p className="text-lg font-medium text-gray-400">
              {filter === 'unresolved' ? 'No unresolved mistakes! Great work!' : 'No mistakes found'}
            </p>
            <p className="mt-1 text-sm text-gray-400">Keep practicing to track your mistakes here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMistakes.map((m) => {
              const isExpanded = expandedId === m.id;
              const revisionProgress = Math.min(100, (m.revision_count / 3) * 100);

              return (
                <div key={m.id} className={`card border-l-4 transition-shadow hover:shadow-md ${m.is_resolved ? 'border-l-green-500' : m.revision_count >= 3 ? 'border-l-yellow-500' : 'border-l-red-500'}`}>
                  <div onClick={() => setExpandedId(isExpanded ? null : m.id)} className="cursor-pointer">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed">{m.question_text}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          {m.topic_name && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{m.topic_name}</span>
                          )}
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            {'★'.repeat(m.difficulty)}{'☆'.repeat(5 - m.difficulty)}
                          </span>
                          {/* Revision progress bar */}
                          <span className="flex items-center gap-1">
                            <span className="text-gray-400">Revised:</span>
                            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                              <div className={`h-full rounded-full ${revisionProgress >= 100 ? 'bg-green-500' : revisionProgress >= 50 ? 'bg-yellow-500' : 'bg-red-400'}`} style={{ width: `${revisionProgress}%` }} />
                            </div>
                            <span className="text-gray-500">{m.revision_count}/3</span>
                          </span>
                          {m.is_resolved && <span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-700">Resolved</span>}
                          <span className="text-gray-400">{new Date(m.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>
                      <svg className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="mt-4 space-y-4 border-t border-gray-100 pt-4 dark:border-gray-700">
                      {/* Options */}
                      <div className="grid gap-2 sm:grid-cols-2">
                        {Object.entries(m.options).map(([key, value]) => {
                          const isCorrect = m.correct_answer.includes(key);
                          return (
                            <div key={key} className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                              isCorrect ? 'border-green-400 bg-green-50 dark:border-green-600 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'
                            }`}>
                              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold ${isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>{key}</span>
                              <span className={isCorrect ? 'font-medium text-green-800 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}>{value}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      {m.explanation && (
                        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-400">Explanation</p>
                          </div>
                          <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">{m.explanation}</p>
                        </div>
                      )}

                      {/* Notes */}
                      {editingNotes === m.id ? (
                        <div className="space-y-2">
                          <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Write your notes — why you got it wrong, what to remember..." className="input w-full text-sm" rows={3} />
                          <div className="flex gap-2">
                            <button onClick={() => handleSaveNotes(m.id)} className="btn-primary text-sm">Save</button>
                            <button onClick={() => setEditingNotes(null)} className="btn-secondary text-sm">Cancel</button>
                          </div>
                        </div>
                      ) : m.notes ? (
                        <div className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-semibold uppercase text-yellow-600">Your Notes</p>
                            <button onClick={() => { setEditingNotes(m.id); setNoteText(m.notes || ''); }} className="text-xs text-yellow-600 hover:underline">Edit</button>
                          </div>
                          <p className="text-sm text-yellow-800 dark:text-yellow-300">{m.notes}</p>
                        </div>
                      ) : null}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button onClick={() => handleRevise(m.id)} className="flex items-center gap-1.5 rounded-lg bg-purple-100 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          Revise ({m.revision_count}/3)
                        </button>
                        {!m.notes && editingNotes !== m.id && (
                          <button onClick={() => { setEditingNotes(m.id); setNoteText(''); }} className="flex items-center gap-1.5 rounded-lg bg-yellow-100 px-3 py-1.5 text-sm font-medium text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Add Notes
                          </button>
                        )}
                        {!m.is_resolved && (
                          <button onClick={() => handleResolve(m.id)} className="flex items-center gap-1.5 rounded-lg bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
