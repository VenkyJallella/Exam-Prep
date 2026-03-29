import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../../lib/api/client';

interface BlogPostDetail {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  meta_description: string;
  meta_keywords: string[];
  tags: string[];
  featured_image_url: string | null;
  reading_time_minutes: number;
  status: string;
  exam_id: string | null;
  topic_id: string | null;
  view_count: number;
  is_ai_generated: boolean;
  published_at: string | null;
  created_at: string;
}

function renderMarkdown(md: string): string {
  return md
    .replace(/```[\w]*\n([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto text-sm my-4"><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">$1</code>')
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary-600 hover:underline dark:text-primary-400" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-gray-700 dark:text-gray-300">$1</li>')
    .replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul class="space-y-1 my-4">$1</ul>')
    .replace(/^(?!<[a-z])((?!^\s*$).+)$/gm, '<p class="text-gray-700 leading-relaxed dark:text-gray-300 my-3">$1</p>');
}

export default function AdminBlogDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPostDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editExcerpt, setEditExcerpt] = useState('');
  const [editMetaDesc, setEditMetaDesc] = useState('');
  const [editTags, setEditTags] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPost = async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/blog/admin/${postId}`);
      const p = res.data.data;
      setPost(p);
      setEditTitle(p.title);
      setEditContent(p.content);
      setEditExcerpt(p.excerpt);
      setEditMetaDesc(p.meta_description);
      setEditTags((p.tags || []).join(', '));
    } catch {
      toast.error('Failed to load blog post');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const handleSave = async () => {
    if (!postId) return;
    setSaving(true);
    try {
      await apiClient.patch(`/blog/admin/${postId}`, {
        title: editTitle,
        content: editContent,
        excerpt: editExcerpt,
        meta_description: editMetaDesc,
        tags: editTags ? editTags.split(',').map((t) => t.trim()) : [],
      });
      toast.success('Post updated');
      setEditing(false);
      fetchPost();
    } catch {
      toast.error('Failed to update post');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!postId) return;
    try {
      const res = await apiClient.post(`/blog/admin/${postId}/toggle-publish`);
      toast.success(`Post ${res.data.data.status === 'published' ? 'published' : 'unpublished'}`);
      fetchPost();
    } catch {
      toast.error('Failed to toggle publish');
    }
  };

  const handleDelete = async () => {
    if (!postId || !confirm('Delete this post?')) return;
    try {
      await apiClient.delete(`/blog/admin/${postId}`);
      toast.success('Post deleted');
      navigate('/admin/blogs');
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl animate-pulse space-y-4 p-6">
        <div className="h-8 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="mt-8 space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-4 w-full rounded bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-6 text-center text-gray-500">
        Post not found.{' '}
        <button onClick={() => navigate('/admin/blogs')} className="text-primary-600 hover:underline">
          Back to Blogs
        </button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Admin - {post.title} | ExamPrep</title>
      </Helmet>

      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <button
              onClick={() => navigate('/admin/blogs')}
              className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Blogs
            </button>
            {!editing ? (
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{post.title}</h1>
            ) : (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="input w-full text-2xl font-bold"
              />
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  post.status === 'published'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}
              >
                {post.status}
              </span>
              {post.is_ai_generated && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                  AI Generated
                </span>
              )}
              <span>{post.reading_time_minutes} min read</span>
              <span>{post.view_count} views</span>
              <span>{new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>

          <div className="flex gap-2">
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} className="btn-secondary text-sm" disabled={saving}>
                  Cancel
                </button>
                <button onClick={handleSave} className="btn-primary text-sm" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="btn-secondary text-sm">
                  Edit
                </button>
                <button onClick={handleTogglePublish} className="btn-secondary text-sm">
                  {post.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={handleDelete} className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 px-3 py-2">
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {/* Meta info (edit mode) */}
        {editing && (
          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">SEO & Meta</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Excerpt</label>
                <input
                  type="text"
                  value={editExcerpt}
                  onChange={(e) => setEditExcerpt(e.target.value)}
                  className="input mt-1 w-full text-sm"
                  maxLength={500}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Meta Description ({editMetaDesc.length}/160)
                </label>
                <input
                  type="text"
                  value={editMetaDesc}
                  onChange={(e) => setEditMetaDesc(e.target.value)}
                  className="input mt-1 w-full text-sm"
                  maxLength={160}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="input mt-1 w-full text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tags (view mode) */}
        {!editing && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
          {editing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={30}
              className="input w-full rounded-lg border-0 font-mono text-sm"
              placeholder="Markdown content..."
            />
          ) : (
            <div
              className="p-6"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
            />
          )}
        </div>

        {/* Slug & Meta (view mode) */}
        {!editing && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">SEO Info</h3>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <p><span className="font-medium">Slug:</span> /blog/{post.slug}</p>
              <p><span className="font-medium">Meta:</span> {post.meta_description}</p>
              {post.meta_keywords.length > 0 && (
                <p><span className="font-medium">Keywords:</span> {post.meta_keywords.join(', ')}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
