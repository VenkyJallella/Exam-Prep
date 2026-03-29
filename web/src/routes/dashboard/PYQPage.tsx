import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import apiClient from '@/lib/api/client';
import { examsAPI, type Exam } from '@/lib/api/exams';

interface PYQuestion {
  id: string; question_text: string; options: Record<string, string>; correct_answer: string[];
  explanation: string | null; difficulty: number; topic_id: string; year: number | null;
  paper_source: string | null; image_url: string | null; tags: string[];
}

export default function PYQPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [year, setYear] = useState('');
  const [questions, setQuestions] = useState<PYQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  useEffect(() => { examsAPI.list().then(r => setExams(r.data.data)).catch(() => {}); }, []);

  const fetchPYQ = () => {
    setLoading(true);
    const params: Record<string, any> = {};
    if (selectedExam) params.exam_id = selectedExam;
    // Fetch questions that have year set
    apiClient.get('/questions', { params })
      .then(r => {
        let qs = (r.data.data || []).filter((q: any) => q.year || q.paper_source);
        if (year) qs = qs.filter((q: any) => q.year === Number(year));
        setQuestions(qs);
      })
      .catch(() => setQuestions([]))
      .finally(() => { setLoading(false); setPage(1); });
  };

  useEffect(() => { if (selectedExam) fetchPYQ(); }, [selectedExam, year]);

  const years = [2026, 2025, 2024, 2023, 2022, 2021, 2020];
  const paginatedQ = questions.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(questions.length / PER_PAGE);

  return (
    <>
      <Helmet><title>Previous Year Papers - ExamPrep</title></Helmet>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Previous Year Papers</h1>
          <p className="mt-1 text-sm text-gray-500">Practice with actual exam questions from previous years</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)} className="input flex-1">
            <option value="">Select Exam</option>
            {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={year} onChange={e => setYear(e.target.value)} className="input w-32">
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {!selectedExam && (
          <div className="card py-16 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">Select an Exam</h2>
            <p className="mt-1 text-sm text-gray-500">Choose an exam to view previous year questions</p>
          </div>
        )}

        {loading && <div className="flex h-32 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" /></div>}

        {!loading && selectedExam && questions.length === 0 && (
          <div className="card py-12 text-center text-gray-500">No previous year papers available for this selection</div>
        )}

        {/* Questions */}
        {!loading && paginatedQ.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400">{questions.length} questions found</p>
            {paginatedQ.map((q, i) => (
              <div key={q.id} className="card border-l-4 border-l-primary-500 cursor-pointer" onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-400">Q{(page - 1) * PER_PAGE + i + 1}</span>
                      {q.paper_source && <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-400">{q.paper_source}</span>}
                      {q.year && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">{q.year}</span>}
                      <span className="text-xs text-gray-400">{'★'.repeat(q.difficulty)}{'☆'.repeat(5 - q.difficulty)}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{q.question_text}</p>
                    {q.image_url && <img src={q.image_url} alt="" className="mt-2 max-h-48 rounded-lg" />}
                  </div>
                  <svg className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${expandedId === q.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>

                {expandedId === q.id && (
                  <div className="mt-4 space-y-3 border-t pt-4 border-gray-100 dark:border-gray-700">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Object.entries(q.options).map(([key, val]) => {
                        const isCorrect = q.correct_answer.includes(key);
                        return (
                          <div key={key} className={`rounded-lg border px-3 py-2 text-sm ${isCorrect ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                            <span className="font-bold mr-1">{key}.</span>{val}{isCorrect && <span className="ml-1 text-green-600 font-semibold">✓</span>}
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && (
                      <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                        <p className="text-xs font-semibold uppercase text-blue-500 mb-1">Explanation</p>{q.explanation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm disabled:opacity-40">Prev</button>
                <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm disabled:opacity-40">Next</button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
