import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import apiClient from '../../lib/api/client';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  status: string;
  tags: string[];
  reading_time_minutes: number;
  view_count: number;
  is_ai_generated: boolean;
  published_at: string | null;
  created_at: string;
}

export default function AdminBlogs() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Generate modal state
  const [showGenerate, setShowGenerate] = useState(false);
  const [genTopic, setGenTopic] = useState('');
  const [genExplanation, setGenExplanation] = useState('');
  const [genExamName, setGenExamName] = useState('');
  const [genAutoPublish, setGenAutoPublish] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Manual create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createExcerpt, setCreateExcerpt] = useState('');
  const [createMetaDesc, setCreateMetaDesc] = useState('');
  const [createTags, setCreateTags] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await apiClient.get('/blog/admin/list', { params });
      setPosts(res.data.data);
      setTotal(res.data.meta.total);
    } catch {
      toast.error('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPosts();
  };

  const handleGenerate = async () => {
    if (!genTopic.trim() || !genExplanation.trim()) {
      toast.error('Topic and explanation are required');
      return;
    }
    setGenerating(true);
    try {
      const res = await apiClient.post('/blog/admin/generate', {
        topic: genTopic,
        explanation: genExplanation,
        exam_name: genExamName || undefined,
        auto_publish: genAutoPublish,
      });
      toast.success(`Blog generated: "${res.data.data.title}"`);
      setShowGenerate(false);
      setGenTopic('');
      setGenExplanation('');
      setGenExamName('');
      setGenAutoPublish(false);
      fetchPosts();
    } catch {
      toast.error('Failed to generate blog post. Check AI configuration.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreate = async () => {
    if (!createTitle.trim() || !createContent.trim()) {
      toast.error('Title and content are required');
      return;
    }
    setCreating(true);
    try {
      await apiClient.post('/blog/admin/create', {
        title: createTitle,
        content: createContent,
        excerpt: createExcerpt || createContent.slice(0, 150),
        meta_description: createMetaDesc || createTitle,
        tags: createTags ? createTags.split(',').map((t) => t.trim()) : [],
        status: 'draft',
      });
      toast.success('Blog post created as draft');
      setShowCreate(false);
      setCreateTitle('');
      setCreateContent('');
      setCreateExcerpt('');
      setCreateMetaDesc('');
      setCreateTags('');
      fetchPosts();
    } catch {
      toast.error('Failed to create blog post');
    } finally {
      setCreating(false);
    }
  };

  const handleTogglePublish = async (postId: string) => {
    try {
      const res = await apiClient.post(`/blog/admin/${postId}/toggle-publish`);
      toast.success(`Post ${res.data.data.status === 'published' ? 'published' : 'unpublished'}`);
      fetchPosts();
    } catch {
      toast.error('Failed to toggle publish status');
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await apiClient.delete(`/blog/admin/${postId}`);
      toast.success('Post deleted');
      fetchPosts();
    } catch {
      toast.error('Failed to delete post');
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <Helmet>
        <title>Admin - Blog Management | ExamPrep</title>
        <meta name="description" content="Manage and generate AI-powered blog posts for ExamPrep." />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Blog Management</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {total} total post{total !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(true)} className="btn-secondary text-sm">
              Write Post
            </button>
            <button onClick={() => setShowGenerate(true)} className="btn-primary text-sm">
              AI Generate
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <form onSubmit={handleSearch} className="flex-1">
            <input
              type="text"
              placeholder="Search posts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-full"
            />
          </form>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="input w-40"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Title</th>
                <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Status</th>
                <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Source</th>
                <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Views</th>
                <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Date</th>
                <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No blog posts yet. Click "AI Generate" to create your first post.
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="px-4 py-3">
                      <div className="max-w-xs truncate font-medium text-gray-900 dark:text-white">
                        {post.title}
                      </div>
                      <div className="mt-0.5 flex gap-1">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          post.status === 'published'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}
                      >
                        {post.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {post.is_ai_generated ? (
                        <span className="inline-flex items-center gap-1 text-xs">
                          <svg className="h-3.5 w-3.5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          AI
                        </span>
                      ) : (
                        <span className="text-xs">Manual</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{post.view_count}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {new Date(post.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleTogglePublish(post.id)}
                          className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                        >
                          {post.status === 'published' ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* AI Generate Modal */}
      {showGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Generate Blog with AI</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Provide a topic and explanation. AI will generate a unique, SEO-friendly blog post in Indian English.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Topic / Title Idea *
                </label>
                <input
                  type="text"
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  placeholder="e.g., How to prepare for UPSC Prelims in 6 months"
                  className="input mt-1 w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Explanation / Context *
                </label>
                <textarea
                  value={genExplanation}
                  onChange={(e) => setGenExplanation(e.target.value)}
                  placeholder="Describe what the blog should cover, key points to include, target audience..."
                  rows={4}
                  className="input mt-1 w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Target Exam (optional)
                </label>
                <input
                  type="text"
                  value={genExamName}
                  onChange={(e) => setGenExamName(e.target.value)}
                  placeholder="e.g., UPSC, JEE, SSC CGL"
                  className="input mt-1 w-full"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={genAutoPublish}
                  onChange={(e) => setGenAutoPublish(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Auto-publish after generation
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowGenerate(false)}
                disabled={generating}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button onClick={handleGenerate} disabled={generating} className="btn-primary text-sm">
                {generating ? 'Generating...' : 'Generate Blog'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Write Blog Post</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title *</label>
                <input
                  type="text"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="input mt-1 w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Content (Markdown) *
                </label>
                <textarea
                  value={createContent}
                  onChange={(e) => setCreateContent(e.target.value)}
                  rows={10}
                  className="input mt-1 w-full font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Excerpt</label>
                <input
                  type="text"
                  value={createExcerpt}
                  onChange={(e) => setCreateExcerpt(e.target.value)}
                  className="input mt-1 w-full"
                  placeholder="Short summary for blog cards"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Meta Description
                </label>
                <input
                  type="text"
                  value={createMetaDesc}
                  onChange={(e) => setCreateMetaDesc(e.target.value)}
                  className="input mt-1 w-full"
                  maxLength={160}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={createTags}
                  onChange={(e) => setCreateTags(e.target.value)}
                  className="input mt-1 w-full"
                  placeholder="UPSC, preparation, strategy"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} disabled={creating} className="btn-secondary text-sm">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={creating} className="btn-primary text-sm">
                {creating ? 'Creating...' : 'Create Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
