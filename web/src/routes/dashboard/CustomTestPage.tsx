import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { examsAPI, type Exam, type Subject, type Topic } from '@/lib/api/exams';
import apiClient from '@/lib/api/client';
import toast from 'react-hot-toast';

export default function CustomTestPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Topic[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<number | undefined>(undefined);
  const [isTimed, setIsTimed] = useState(true);
  const [duration, setDuration] = useState(30);
  const [starting, setStarting] = useState(false);

  useEffect(() => { examsAPI.list().then(r => setExams(r.data.data)).catch(() => {}); }, []);

  useEffect(() => {
    if (!selectedExam) { setSubjects([]); setSelectedSubjects([]); return; }
    examsAPI.getSubjects(selectedExam.slug).then(r => setSubjects(r.data.data)).catch(() => {});
    setSelectedSubjects([]); setTopics([]); setSelectedTopics([]);
  }, [selectedExam]);

  useEffect(() => {
    if (!selectedExam || selectedSubjects.length === 0) { setTopics([]); return; }
    Promise.all(selectedSubjects.map(s => examsAPI.getTopics(selectedExam!.slug, s.id)))
      .then(results => setTopics(results.flatMap(r => r.data.data)))
      .catch(() => {});
    setSelectedTopics([]);
  }, [selectedSubjects]);

  const toggleSubject = (s: Subject) => {
    setSelectedSubjects(prev => prev.find(x => x.id === s.id) ? prev.filter(x => x.id !== s.id) : [...prev, s]);
  };
  const toggleTopic = (t: Topic) => {
    setSelectedTopics(prev => prev.find(x => x.id === t.id) ? prev.filter(x => x.id !== t.id) : [...prev, t]);
  };

  const handleStart = async () => {
    if (!selectedExam) { toast.error('Select an exam'); return; }
    setStarting(true);
    try {
      const res = await apiClient.post('/practice/sessions', {
        exam_id: selectedExam.id,
        subject_id: selectedSubjects.length === 1 ? selectedSubjects[0].id : undefined,
        topic_id: selectedTopics.length === 1 ? selectedTopics[0].id : undefined,
        question_count: questionCount,
        difficulty,
      });
      navigate(`/practice/${res.data.data.id}`);
    } catch { toast.error('Failed to start. Ensure questions exist for this selection.'); }
    finally { setStarting(false); }
  };

  return (
    <>
      <Helmet><title>Custom Test - ExamPrep</title></Helmet>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Build Your Test</h1>
          <p className="mt-1 text-sm text-gray-500">Pick topics, set difficulty, and create a personalized test</p>
        </div>

        {/* Step 1: Exam */}
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">1. Select Exam</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {exams.map(e => (
              <button key={e.id} onClick={() => setSelectedExam(e)} className={`rounded-xl border-2 p-3 text-center text-sm font-medium transition-all ${selectedExam?.id === e.id ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/20' : 'border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300'}`}>{e.name}</button>
            ))}
          </div>
        </div>

        {/* Step 2: Subjects */}
        {selectedExam && subjects.length > 0 && (
          <div className="card space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">2. Select Subjects (multi)</h2>
            <div className="flex flex-wrap gap-2">
              {subjects.map(s => {
                const active = selectedSubjects.find(x => x.id === s.id);
                return <button key={s.id} onClick={() => toggleSubject(s)} className={`rounded-lg border px-3 py-1.5 text-sm transition-all ${active ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/20' : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400'}`}>{s.name}</button>;
              })}
            </div>
          </div>
        )}

        {/* Step 3: Topics */}
        {topics.length > 0 && (
          <div className="card space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">3. Select Topics (optional)</h2>
            <div className="flex flex-wrap gap-2">
              {topics.map(t => {
                const active = selectedTopics.find(x => x.id === t.id);
                return <button key={t.id} onClick={() => toggleTopic(t)} className={`rounded-lg border px-3 py-1.5 text-sm transition-all ${active ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/20' : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400'}`}>{t.name}</button>;
              })}
            </div>
          </div>
        )}

        {/* Step 4: Config */}
        {selectedExam && (
          <div className="card space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">4. Configure</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Questions</label>
                <select value={questionCount} onChange={e => setQuestionCount(Number(e.target.value))} className="input">{[5, 10, 15, 20, 25, 30, 40, 50].map(n => <option key={n} value={n}>{n}</option>)}</select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Difficulty</label>
                <select value={difficulty ?? ''} onChange={e => setDifficulty(e.target.value ? Number(e.target.value) : undefined)} className="input">
                  <option value="">Adaptive</option><option value="1">Easy</option><option value="2">Medium-Easy</option><option value="3">Medium</option><option value="4">Hard</option><option value="5">Very Hard</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={isTimed} onChange={e => setIsTimed(e.target.checked)} className="rounded border-gray-300" /> Timed Test
            </label>
            {isTimed && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Duration (minutes)</label>
                <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="input w-32">{[10, 15, 20, 30, 45, 60, 90, 120].map(n => <option key={n} value={n}>{n} min</option>)}</select>
              </div>
            )}
          </div>
        )}

        {/* Summary + Start */}
        {selectedExam && (
          <div className="card bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/10 dark:to-accent-900/10">
            <h3 className="font-semibold text-gray-900 dark:text-white">Test Summary</h3>
            <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <p>Exam: <strong>{selectedExam.name}</strong></p>
              <p>Subjects: <strong>{selectedSubjects.length > 0 ? selectedSubjects.map(s => s.name).join(', ') : 'All'}</strong></p>
              <p>Topics: <strong>{selectedTopics.length > 0 ? selectedTopics.map(t => t.name).join(', ') : 'All'}</strong></p>
              <p>Questions: <strong>{questionCount}</strong> | Difficulty: <strong>{difficulty ? `Level ${difficulty}` : 'Adaptive'}</strong> | Mode: <strong>{isTimed ? `Timed (${duration}min)` : 'Untimed'}</strong></p>
            </div>
            <button onClick={handleStart} disabled={starting} className="btn-primary mt-4 w-full py-3 text-base">{starting ? 'Creating...' : 'Start Test'}</button>
          </div>
        )}
      </div>
    </>
  );
}
