import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import apiClient from '../../lib/api/client';
import toast from 'react-hot-toast';

interface UserOption {
  id: number;
  email: string;
  full_name: string;
}

export default function AdminEmail() {
  const [prompt, setPrompt] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [target, setTarget] = useState('all');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [counts, setCounts] = useState<{ all: number; free: number; paid: number; inactive: number }>({ all: 0, free: 0, paid: 0, inactive: 0 });

  // Selected users state
  const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<UserOption[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiClient.get('/admin/email/recipients').then(r => setCounts(r.data.data)).catch(() => {});
  }, []);

  // Debounced user search
  useEffect(() => {
    if (target !== 'selected') return;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const res = await apiClient.get('/admin/email/users/search', { params: { q: userSearch } });
        setUserResults(res.data.data.filter((u: UserOption) => !selectedUsers.some(s => s.id === u.id)));
        setShowUserDropdown(true);
      } catch { setUserResults([]); }
      finally { setSearchingUsers(false); }
    }, 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [userSearch, target, selectedUsers]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowUserDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error('Enter a prompt'); return; }
    setGenerating(true);
    try {
      const res = await apiClient.post('/admin/email/generate', { prompt });
      setSubject(res.data.data.subject);
      setBodyHtml(res.data.data.body_html);
      toast.success('Email generated!');
    } catch { toast.error('Failed to generate. Try again.'); }
    finally { setGenerating(false); }
  };

  const handlePreview = async () => {
    if (!bodyHtml) { toast.error('Generate email first'); return; }
    try {
      const res = await apiClient.post('/admin/email/preview', { body_html: bodyHtml });
      setPreviewHtml(res.data.data.html);
      setShowPreview(true);
    } catch { toast.error('Preview failed'); }
  };

  const handleSendTest = async () => {
    if (!bodyHtml || !subject) { toast.error('Generate email first'); return; }
    setSending(true);
    try {
      const res = await apiClient.post('/admin/email/send-test', { subject, body_html: bodyHtml });
      toast.success(res.data.data.message);
    } catch { toast.error('Failed to send test email'); }
    finally { setSending(false); }
  };

  const handleSend = async () => {
    if (!bodyHtml || !subject) { toast.error('Generate email first'); return; }
    const recipientCount = target === 'selected' ? selectedUsers.length : target === 'all' ? counts.all : target === 'free' ? counts.free : target === 'paid' ? counts.paid : counts.inactive;
    if (!confirm(`Send email to ${recipientCount} users? This cannot be undone.`)) return;
    setSending(true);
    try {
      const payload: Record<string, unknown> = { subject, body_html: bodyHtml, target };
      if (target === 'selected') payload.user_ids = selectedUsers.map(u => u.id);
      const res = await apiClient.post('/admin/email/send', payload);
      toast.success(res.data.data.message);
    } catch { toast.error('Failed to send'); }
    finally { setSending(false); }
  };

  const targetCount = target === 'selected' ? selectedUsers.length : target === 'all' ? counts.all : target === 'free' ? counts.free : target === 'paid' ? counts.paid : counts.inactive;

  return (
    <>
      <Helmet><title>Email Campaigns | Admin - ExamPrep</title></Helmet>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Campaigns</h1>
          <p className="mt-1 text-sm text-gray-500">Send AI-generated emails to your users</p>
        </div>

        {/* Step 1: Generate */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">1. Generate Email with AI</h2>
          <p className="mt-1 text-sm text-gray-500">Describe what you want to communicate and AI will write a professional email.</p>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={3}
            placeholder="e.g., Inform users about new NEET mock tests and 500+ new questions added this week. Mention upcoming SSC CGL exam dates."
            className="input mt-3 w-full"
          />
          <button onClick={handleGenerate} disabled={generating} className="btn-primary mt-3 text-sm">
            {generating ? 'Generating...' : 'Generate with AI'}
          </button>
        </div>

        {/* Generated content */}
        {(subject || bodyHtml) && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">2. Review & Edit</h2>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject Line</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} className="input mt-1 w-full" />
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Body (HTML)</label>
              <textarea value={bodyHtml} onChange={e => setBodyHtml(e.target.value)} rows={10} className="input mt-1 w-full font-mono text-xs" />
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={handlePreview} className="btn-secondary text-sm">Preview</button>
              <button onClick={handleSendTest} disabled={sending} className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100">
                {sending ? 'Sending...' : 'Send Test to Me'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Select recipients */}
        {bodyHtml && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">3. Select Recipients</h2>
            <div className="mt-3 space-y-2">
              {[
                { id: 'all', label: 'All users', count: counts.all },
                { id: 'free', label: 'Free users only', count: counts.free },
                { id: 'paid', label: 'Pro/Premium users only', count: counts.paid },
                { id: 'inactive', label: 'Inactive users (7+ days)', count: counts.inactive },
                { id: 'selected', label: 'Selected users', count: selectedUsers.length },
              ].map(opt => (
                <label key={opt.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-colors ${target === opt.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'}`}>
                  <input type="radio" name="target" value={opt.id} checked={target === opt.id} onChange={e => setTarget(e.target.value)} className="text-primary-600" />
                  <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">{opt.label}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-400">{opt.count}</span>
                </label>
              ))}

              {/* User search & picker for "Selected users" */}
              {target === 'selected' && (
                <div className="mt-3 space-y-3">
                  {/* Selected user chips */}
                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedUsers.map(u => (
                        <span key={u.id} className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-sm font-medium text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                          {u.full_name || u.email}
                          <button onClick={() => setSelectedUsers(prev => prev.filter(s => s.id !== u.id))} className="ml-1 text-primary-600 hover:text-primary-800 dark:text-primary-400">&times;</button>
                        </span>
                      ))}
                      <button onClick={() => setSelectedUsers([])} className="text-xs text-gray-500 hover:text-red-600">Clear all</button>
                    </div>
                  )}

                  {/* Search input */}
                  <div className="relative" ref={dropdownRef}>
                    <input
                      type="text"
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      onFocus={() => setShowUserDropdown(true)}
                      placeholder="Search by name or email..."
                      className="input w-full"
                    />
                    {searchingUsers && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
                      </div>
                    )}

                    {/* Dropdown results */}
                    {showUserDropdown && userResults.length > 0 && (
                      <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                        {userResults.map(u => (
                          <button
                            key={u.id}
                            onClick={() => {
                              setSelectedUsers(prev => [...prev, u]);
                              setUserResults(prev => prev.filter(r => r.id !== u.id));
                              setUserSearch('');
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <span className="font-medium text-gray-900 dark:text-white">{u.full_name || 'No name'}</span>
                            <span className="text-gray-500 dark:text-gray-400">{u.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {showUserDropdown && !searchingUsers && userResults.length === 0 && userSearch && (
                      <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white p-3 text-center text-sm text-gray-500 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                        No users found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Send */}
        {bodyHtml && (
          <div className="card border-2 border-red-200 dark:border-red-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">4. Send Campaign</h2>
            <p className="mt-1 text-sm text-gray-500">This will send to <strong>{targetCount}</strong> users. Make sure you've tested first.</p>
            <button onClick={handleSend} disabled={sending || targetCount === 0}
              className="mt-4 rounded-lg bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
              {sending ? 'Sending...' : `Send to ${targetCount} Users`}
            </button>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-semibold text-gray-900">Email Preview</h3>
              <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-gray-700">&times;</button>
            </div>
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>
      )}
    </>
  );
}
