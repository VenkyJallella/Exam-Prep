import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { examsAPI, type Exam, type Subject, type Topic } from '@/lib/api/exams';
import apiClient from '@/lib/api/client';
import toast from 'react-hot-toast';

interface PrintQuestion { question_text: string; options: Record<string, string>; correct_answer: string[]; difficulty: number; }

export default function PdfExportPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [count, setCount] = useState(20);
  const [difficulty, setDifficulty] = useState<number | undefined>(undefined);
  const [includeAnswers, setIncludeAnswers] = useState(false);
  const [questions, setQuestions] = useState<PrintQuestion[]>([]);
  const [generating, setGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { examsAPI.list().then(r => setExams(r.data.data)).catch(() => {}); }, []);
  useEffect(() => {
    if (!selectedExam) { setSubjects([]); return; }
    examsAPI.getSubjects(selectedExam.slug).then(r => setSubjects(r.data.data)).catch(() => {});
    setSelectedSubject(null);
  }, [selectedExam]);

  const handleGenerate = async () => {
    if (!selectedExam) { toast.error('Select an exam'); return; }
    setGenerating(true);
    try {
      const params: Record<string, any> = { exam_id: selectedExam.id, per_page: count };
      if (difficulty) params.difficulty = difficulty;
      const res = await apiClient.get('/questions', { params });
      setQuestions(res.data.data || []);
      if ((res.data.data || []).length === 0) toast.error('No questions found');
    } catch { toast.error('Failed to fetch questions'); }
    finally { setGenerating(false); }
  };

  const handlePrint = () => { window.print(); };

  return (
    <>
      <Helmet><title>Export Questions PDF - ExamPrep</title></Helmet>

      {/* Screen UI */}
      <div className="space-y-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Export Questions</h1>
          <p className="mt-1 text-sm text-gray-500">Generate a printable question paper for offline practice</p>
        </div>

        <div className="card space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Exam</label>
              <select value={selectedExam?.id || ''} onChange={e => setSelectedExam(exams.find(x => x.id === e.target.value) || null)} className="input w-full">
                <option value="">Select exam</option>
                {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Questions</label>
              <select value={count} onChange={e => setCount(Number(e.target.value))} className="input w-full">
                {[10, 20, 30, 50].map(n => <option key={n} value={n}>{n} questions</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Difficulty</label>
              <select value={difficulty ?? ''} onChange={e => setDifficulty(e.target.value ? Number(e.target.value) : undefined)} className="input w-full">
                <option value="">Any</option>
                {[1,2,3,4,5].map(d => <option key={d} value={d}>Level {d}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={handleGenerate} disabled={generating || !selectedExam} className="btn-primary w-full">
                {generating ? 'Loading...' : 'Generate'}
              </button>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={includeAnswers} onChange={e => setIncludeAnswers(e.target.checked)} className="rounded border-gray-300" />
            Include answer key at the bottom
          </label>
        </div>

        {questions.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{questions.length} questions ready</p>
              <button onClick={handlePrint} className="btn-primary text-sm">Print / Save as PDF</button>
            </div>

            {/* Preview */}
            <div className="card space-y-4">
              {questions.map((q, i) => (
                <div key={i} className="border-b border-gray-100 pb-3 last:border-0 dark:border-gray-800">
                  <p className="text-sm"><span className="font-bold text-gray-500">Q{i + 1}.</span> {q.question_text}</p>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-600 dark:text-gray-400">
                    {Object.entries(q.options).map(([k, v]) => <p key={k}><span className="font-bold">{k})</span> {v}</p>)}
                  </div>
                </div>
              ))}
              {includeAnswers && (
                <div className="border-t-2 border-gray-300 pt-4">
                  <h3 className="mb-2 text-sm font-bold text-gray-700">Answer Key</h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {questions.map((q, i) => <span key={i} className="rounded bg-gray-100 px-2 py-0.5 dark:bg-gray-800"><strong>Q{i + 1}:</strong> {q.correct_answer.join(', ')}</span>)}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Print layout */}
      <div className="hidden print:block" ref={printRef}>
        <h1 className="mb-1 text-xl font-bold">{selectedExam?.name || 'ExamPrep'} - Question Paper</h1>
        <p className="mb-4 text-sm text-gray-500">{questions.length} Questions | Generated by ExamPrep</p>
        <hr className="mb-4" />
        {questions.map((q, i) => (
          <div key={i} className="mb-4">
            <p className="text-sm"><strong>Q{i + 1}.</strong> {q.question_text}</p>
            <div className="ml-4 mt-1 grid grid-cols-2 gap-1 text-sm">
              {Object.entries(q.options).map(([k, v]) => <p key={k}><strong>{k})</strong> {v}</p>)}
            </div>
          </div>
        ))}
        {includeAnswers && (
          <div className="mt-8 border-t pt-4">
            <h3 className="mb-2 font-bold">Answer Key</h3>
            <p className="text-sm">{questions.map((q, i) => `Q${i + 1}: ${q.correct_answer.join(',')}`).join(' | ')}</p>
          </div>
        )}
      </div>
    </>
  );
}
