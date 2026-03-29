import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import apiClient from '../../lib/api/client';
import toast from 'react-hot-toast';

const PAGE_SLUGS = [
  { slug: 'about', label: 'About Us' },
  { slug: 'terms', label: 'Terms & Conditions' },
  { slug: 'privacy', label: 'Privacy Policy' },
  { slug: 'contact', label: 'Contact Us' },
];

export default function AdminPages() {
  const [selectedSlug, setSelectedSlug] = useState('about');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPage = (slug: string) => {
    setLoading(true);
    apiClient.get(`/pages/${slug}`)
      .then(r => { setTitle(r.data.data.title); setContent(r.data.data.content); })
      .catch(() => { setTitle(''); setContent(''); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPage(selectedSlug); }, [selectedSlug]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/pages/${selectedSlug}`, { title, content });
      toast.success('Page saved!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <>
      <Helmet><title>Admin - Pages | ExamPrep</title></Helmet>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Page Editor</h1>
          <p className="mt-1 text-sm text-gray-500">Edit static pages (About, Terms, Privacy, Contact)</p>
        </div>

        {/* Page selector */}
        <div className="flex gap-2">
          {PAGE_SLUGS.map(p => (
            <button key={p.slug} onClick={() => setSelectedSlug(p.slug)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${selectedSlug === p.slug ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'}`}>
              {p.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="h-64 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Page Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Content (Markdown)</label>
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={20} className="input w-full font-mono text-sm" />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">Use Markdown: ## for headings, **bold**, - for lists, [link](url)</p>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Save Page'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
