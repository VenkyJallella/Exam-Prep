import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
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

  const loadData = () => {
    setLoading(true);
    const resolved = filter === 'all' ? undefined : filter === 'resolved';
    Promise.all([
      apiClient.get('/mistakes', { params: { resolved } }).then((r) => setMistakes(r.data.data)),
      apiClient.get('/mistakes/summary').then((r) => setSummary(r.data.data)),
    ])
      .catch(() => toast.error('Failed to load mistakes'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [filter]);

  const handleRevise = async (id: string) => {
    try {
      await apiClient.post(`/mistakes/${id}/revise`);
      toast.success('Marked as revised!');
      loadData();
    } catch {
      toast.error('Failed to mark as revised');
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await apiClient.post(`/mistakes/${id}/resolve`);
      toast.success('Mistake resolved!');
      loadData();
    } catch {
      toast.error('Failed to resolve');
    }
  };

  const handleSaveNotes = async (id: string) => {
    try {
      await apiClient.patch(`/mistakes/${id}/notes`, { notes: noteText });
      toast.success('Notes saved');
      setEditingNotes(null);
      loadData();
    } catch {
      toast.error('Failed to save notes');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Mistake Book - ExamPrep</title></Helmet>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mistake Book</h1>
          <p className="mt-1 text-sm text-gray-500">Review and revise questions you got wrong.</p>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card text-center">
              <p className="text-3xl font-bold text-red-600">{summary.unresolved}</p>
              <p className="text-sm text-gray-500">Unresolved</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-green-600">{summary.resolved}</p>
              <p className="text-sm text-gray-500">Resolved</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.total}</p>
              <p className="text-sm text-gray-500">Total Mistakes</p>
            </div>
          </div>
        )}

        {/* Weak topics */}
        {summary && summary.weak_topics.length > 0 && (
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Weak Topics</h3>
            <div className="flex flex-wrap gap-2">
              {summary.weak_topics.map((t) => (
                <span
                  key={t.topic_id}
                  className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400"
                >
                  {t.topic_name} ({t.mistake_count})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {(['unresolved', 'resolved', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium capitalize transition-all ${
                filter === f
                  ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Mistakes list */}
        {mistakes.length === 0 ? (
          <div className="card py-12 text-center">
            <p className="text-lg font-medium text-gray-400">
              {filter === 'unresolved' ? 'No unresolved mistakes!' : 'No mistakes found'}
            </p>
            <p className="mt-1 text-sm text-gray-400">Keep practicing to log mistakes here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mistakes.map((m) => (
              <div
                key={m.id}
                className={`card cursor-pointer border-l-4 transition-shadow hover:shadow-md ${
                  m.is_resolved ? 'border-l-green-500' : 'border-l-red-500'
                }`}
              >
                <div
                  onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {m.question_text}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {m.topic_name && (
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {m.topic_name}
                          </span>
                        )}
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                          Difficulty {m.difficulty}
                        </span>
                        <span className="rounded bg-purple-100 px-2 py-0.5 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          Revised {m.revision_count}x
                        </span>
                      </div>
                    </div>
                    <svg className={`h-5 w-5 text-gray-400 transition-transform ${expandedId === m.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded view */}
                {expandedId === m.id && (
                  <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 dark:border-gray-700">
                    {/* Options with correct answer highlighted */}
                    <div className="space-y-2">
                      {Object.entries(m.options).map(([key, value]) => (
                        <div
                          key={key}
                          className={`rounded-lg border px-3 py-2 text-sm ${
                            m.correct_answer.includes(key)
                              ? 'border-green-500 bg-green-50 text-green-800 dark:border-green-400 dark:bg-green-900/20 dark:text-green-300'
                              : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'
                          }`}
                        >
                          <span className="font-bold">{key}.</span> {value}
                          {m.correct_answer.includes(key) && (
                            <span className="ml-2 text-xs font-semibold text-green-600"> Correct</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {m.explanation && (
                      <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                        <p className="mb-1 text-xs font-semibold uppercase text-blue-500">Explanation</p>
                        {m.explanation}
                      </div>
                    )}

                    {/* Notes */}
                    {editingNotes === m.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Write your notes..."
                          className="input w-full"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveNotes(m.id)}
                            className="btn-primary text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingNotes(null)}
                            className="btn-secondary text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : m.notes ? (
                      <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                        <p className="mb-1 text-xs font-semibold uppercase text-yellow-500">Your Notes</p>
                        {m.notes}
                        <button
                          onClick={() => { setEditingNotes(m.id); setNoteText(m.notes || ''); }}
                          className="ml-2 text-xs text-yellow-600 underline"
                        >
                          Edit
                        </button>
                      </div>
                    ) : null}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRevise(m.id)}
                        className="btn-secondary text-sm"
                      >
                        Mark Revised ({m.revision_count}/3)
                      </button>
                      {!m.notes && editingNotes !== m.id && (
                        <button
                          onClick={() => { setEditingNotes(m.id); setNoteText(''); }}
                          className="btn-secondary text-sm"
                        >
                          Add Notes
                        </button>
                      )}
                      {!m.is_resolved && (
                        <button
                          onClick={() => handleResolve(m.id)}
                          className="text-sm font-medium text-green-600 hover:text-green-700"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
