import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { adminAPI } from '@/lib/api/admin';
import toast from 'react-hot-toast';

interface TopicNode {
  id: string;
  name: string;
  slug: string;
}

interface SubjectNode {
  id: string;
  name: string;
  slug: string;
  topics: TopicNode[];
}

interface ExamNode {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  subjects: SubjectNode[];
}

export default function AdminExams() {
  const [exams, setExams] = useState<ExamNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Create forms
  const [showAddExam, setShowAddExam] = useState(false);
  const [newExamName, setNewExamName] = useState('');
  const [newExamDesc, setNewExamDesc] = useState('');

  const [addSubjectFor, setAddSubjectFor] = useState<string | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');

  const [addTopicFor, setAddTopicFor] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState('');

  const loadExams = () => {
    setLoading(true);
    adminAPI
      .listExams()
      .then((r) => setExams(r.data.data))
      .catch(() => toast.error('Failed to load exams'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadExams();
  }, []);

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleAddExam = async () => {
    if (!newExamName.trim()) return;
    try {
      await adminAPI.createExam({ name: newExamName.trim(), description: newExamDesc.trim() || undefined });
      toast.success('Exam created');
      setShowAddExam(false);
      setNewExamName('');
      setNewExamDesc('');
      loadExams();
    } catch {
      toast.error('Failed to create exam');
    }
  };

  const handleDeleteExam = async (id: string) => {
    if (!confirm('Delete this exam and all its subjects/topics?')) return;
    try {
      await adminAPI.deleteExam(id);
      toast.success('Exam deleted');
      loadExams();
    } catch {
      toast.error('Failed to delete exam');
    }
  };

  const handleAddSubject = async () => {
    if (!addSubjectFor || !newSubjectName.trim()) return;
    try {
      await adminAPI.createSubject({ exam_id: addSubjectFor, name: newSubjectName.trim() });
      toast.success('Subject created');
      setAddSubjectFor(null);
      setNewSubjectName('');
      loadExams();
    } catch {
      toast.error('Failed to create subject');
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Delete this subject and all its topics?')) return;
    try {
      await adminAPI.deleteSubject(id);
      toast.success('Subject deleted');
      loadExams();
    } catch {
      toast.error('Failed to delete subject');
    }
  };

  const handleAddTopic = async () => {
    if (!addTopicFor || !newTopicName.trim()) return;
    try {
      await adminAPI.createTopic({ subject_id: addTopicFor, name: newTopicName.trim() });
      toast.success('Topic created');
      setAddTopicFor(null);
      setNewTopicName('');
      loadExams();
    } catch {
      toast.error('Failed to create topic');
    }
  };

  const handleDeleteTopic = async (id: string) => {
    if (!confirm('Delete this topic?')) return;
    try {
      await adminAPI.deleteTopic(id);
      toast.success('Topic deleted');
      loadExams();
    } catch {
      toast.error('Failed to delete topic');
    }
  };

  return (
    <>
      <Helmet>
        <title>Manage Exams - Admin - ExamPrep</title>
        <meta name="description" content="Admin exam management. Create, edit, and manage competitive exams on ExamPrep." />
      </Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Exams &amp; Taxonomy
          </h1>
          <button onClick={() => setShowAddExam(true)} className="btn-primary text-sm">
            Add Exam
          </button>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          </div>
        ) : exams.length === 0 ? (
          <div className="card py-12 text-center text-gray-400">No exams found</div>
        ) : (
          <div className="space-y-3">
            {exams.map((exam) => (
              <div key={exam.id} className="card p-0">
                {/* Exam header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                  <button
                    onClick={() => toggle(exam.id)}
                    className="flex items-center gap-2 text-left"
                  >
                    <span className="text-gray-400">{expanded[exam.id] ? '\u25BC' : '\u25B6'}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {exam.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({exam.subjects.length} subjects)
                    </span>
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setAddSubjectFor(exam.id);
                        setNewSubjectName('');
                      }}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      + Subject
                    </button>
                    <button
                      onClick={() => handleDeleteExam(exam.id)}
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Subjects tree */}
                {expanded[exam.id] && (
                  <div className="px-4 py-2">
                    {exam.subjects.length === 0 ? (
                      <p className="py-2 pl-6 text-sm text-gray-400">No subjects yet</p>
                    ) : (
                      exam.subjects.map((subj) => (
                        <div key={subj.id} className="ml-4 border-l border-gray-200 pl-4 dark:border-gray-700">
                          <div className="flex items-center justify-between py-2">
                            <button
                              onClick={() => toggle(subj.id)}
                              className="flex items-center gap-2 text-left"
                            >
                              <span className="text-gray-400">
                                {expanded[subj.id] ? '\u25BC' : '\u25B6'}
                              </span>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {subj.name}
                              </span>
                              <span className="text-xs text-gray-400">
                                ({subj.topics.length} topics)
                              </span>
                            </button>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setAddTopicFor(subj.id);
                                  setNewTopicName('');
                                }}
                                className="text-xs font-medium text-blue-600 hover:text-blue-700"
                              >
                                + Topic
                              </button>
                              <button
                                onClick={() => handleDeleteSubject(subj.id)}
                                className="text-xs font-medium text-red-600 hover:text-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          {expanded[subj.id] && (
                            <div className="ml-4 border-l border-gray-200 pl-4 dark:border-gray-700">
                              {subj.topics.length === 0 ? (
                                <p className="py-1 text-xs text-gray-400">No topics yet</p>
                              ) : (
                                subj.topics.map((topic) => (
                                  <div
                                    key={topic.id}
                                    className="flex items-center justify-between py-1"
                                  >
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                      {topic.name}
                                    </span>
                                    <button
                                      onClick={() => handleDeleteTopic(topic.id)}
                                      className="text-xs font-medium text-red-600 hover:text-red-700"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Exam Modal */}
      {showAddExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Exam</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name
                </label>
                <input
                  type="text"
                  value={newExamName}
                  onChange={(e) => setNewExamName(e.target.value)}
                  className="input w-full"
                  placeholder="e.g. UPSC CSE"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  value={newExamDesc}
                  onChange={(e) => setNewExamDesc(e.target.value)}
                  className="input w-full"
                  rows={2}
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowAddExam(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleAddExam}
                disabled={!newExamName.trim()}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {addSubjectFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Subject</h3>
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Subject Name
              </label>
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                className="input w-full"
                placeholder="e.g. General Studies"
              />
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setAddSubjectFor(null)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleAddSubject}
                disabled={!newSubjectName.trim()}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Topic Modal */}
      {addTopicFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Topic</h3>
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Topic Name
              </label>
              <input
                type="text"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                className="input w-full"
                placeholder="e.g. Indian Polity"
              />
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setAddTopicFor(null)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleAddTopic}
                disabled={!newTopicName.trim()}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
