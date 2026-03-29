import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { examsAPI, type Exam, type Subject, type Topic } from '@/lib/api/exams';
import { practiceAPI } from '@/lib/api/practice';
import toast from 'react-hot-toast';

export default function PracticePage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);

  // Load exams
  useEffect(() => {
    setLoading(true);
    examsAPI.list().then((res) => setExams(res.data.data)).catch(() => toast.error('Failed to load exams')).finally(() => setLoading(false));
  }, []);

  // Load subjects when exam selected
  useEffect(() => {
    if (!selectedExam) { setSubjects([]); setSelectedSubject(null); return; }
    examsAPI.getSubjects(selectedExam.slug).then((res) => setSubjects(res.data.data)).catch(() => {});
    setSelectedSubject(null);
    setTopics([]);
    setSelectedTopic(null);
  }, [selectedExam]);

  // Load topics when subject selected
  useEffect(() => {
    if (!selectedExam || !selectedSubject) { setTopics([]); setSelectedTopic(null); return; }
    examsAPI.getTopics(selectedExam.slug, selectedSubject.id).then((res) => setTopics(res.data.data)).catch(() => {});
    setSelectedTopic(null);
  }, [selectedSubject, selectedExam]);

  const handleStart = async () => {
    if (!selectedExam) { toast.error('Select an exam'); return; }
    setStarting(true);
    try {
      const res = await practiceAPI.createSession({
        exam_id: selectedExam.id,
        subject_id: selectedSubject?.id,
        topic_id: selectedTopic?.id,
        question_count: questionCount,
        difficulty,
      });
      navigate(`/practice/${res.data.data.id}`);
    } catch {
      toast.error('Failed to start session. Make sure questions are available.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Practice - ExamPrep</title>
        <meta name="description" content="Practice exam questions with AI-powered adaptive difficulty. Choose your exam, topic, and start practicing." />
      </Helmet>

      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Start Practice Session</h1>
          <p className="mt-1 text-sm text-gray-500">Select exam, topic, and preferences</p>
        </div>

        {/* Step 1: Exam */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">1. Select Exam</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {exams.map((exam) => (
                <button
                  key={exam.id}
                  onClick={() => setSelectedExam(exam)}
                  className={`rounded-xl border-2 p-3 text-center text-sm font-medium transition-all ${
                    selectedExam?.id === exam.id
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-400'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300'
                  }`}
                >
                  {exam.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 2: Subject & Topic */}
        {selectedExam && subjects.length > 0 && (
          <div className="card space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">2. Select Subject</h2>
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSubject(s)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-all ${
                    selectedSubject?.id === s.id
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/20'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>

            {topics.length > 0 && (
              <>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">3. Select Topic (optional)</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedTopic(null)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-all ${
                      !selectedTopic
                        ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/20'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700'
                    }`}
                  >
                    All Topics
                  </button>
                  {topics.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTopic(t)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-all ${
                        selectedTopic?.id === t.id
                          ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/20'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3: Settings */}
        {selectedExam && (
          <div className="card space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Settings</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Questions</label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="input"
                >
                  {[5, 10, 15, 20, 25, 30].map((n) => (
                    <option key={n} value={n}>{n} questions</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Difficulty</label>
                <select
                  value={difficulty ?? ''}
                  onChange={(e) => setDifficulty(e.target.value ? Number(e.target.value) : undefined)}
                  className="input"
                >
                  <option value="">Any</option>
                  <option value="1">Easy</option>
                  <option value="2">Medium-Easy</option>
                  <option value="3">Medium</option>
                  <option value="4">Medium-Hard</option>
                  <option value="5">Hard</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Start button */}
        {selectedExam && (
          <button onClick={handleStart} disabled={starting} className="btn-primary w-full py-3 text-base">
            {starting ? 'Starting...' : `Start Practice (${questionCount} questions)`}
          </button>
        )}
      </div>
    </>
  );
}
