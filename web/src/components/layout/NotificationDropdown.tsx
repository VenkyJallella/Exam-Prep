import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/lib/api/client';

interface Notification { id: string; title: string; message: string; type: string; link: string | null; is_read: boolean; created_at: string; }

function timeAgo(date: string): string {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const TYPE_ICONS: Record<string, string> = {
  achievement: '🏆', reminder: '⏰', system: '🔔', quiz: '⚡', info: 'ℹ️',
};

export default function NotificationDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetchCount = () => {
    apiClient.get('/notifications/unread-count').then(r => setUnreadCount(r.data.data.count)).catch(() => {});
  };

  const fetchNotifications = () => {
    apiClient.get('/notifications', { params: { unread_only: false } }).then(r => setNotifications(r.data.data)).catch(() => {});
  };

  useEffect(() => { fetchCount(); const iv = setInterval(fetchCount, 30000); return () => clearInterval(iv); }, []);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleMarkAllRead = async () => {
    await apiClient.post('/notifications/read-all');
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      await apiClient.post(`/notifications/${n.id}/read`);
      setUnreadCount(c => Math.max(0, c - 1));
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    }
    if (n.link) { navigate(n.link); setOpen(false); }
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs font-medium text-primary-600 hover:underline">Mark all read</button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">No notifications</div>
            ) : (
              notifications.slice(0, 15).map(n => (
                <div key={n.id} onClick={() => handleClick(n)}
                  className={`flex cursor-pointer gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${!n.is_read ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}>
                  <span className="mt-0.5 text-lg">{TYPE_ICONS[n.type] || '🔔'}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${!n.is_read ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{n.title}</p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">{n.message}</p>
                    <p className="mt-1 text-[10px] text-gray-400">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-500" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
