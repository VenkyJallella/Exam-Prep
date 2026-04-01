import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { useThemeStore } from '@/lib/store/themeStore';
import { useNavigate } from 'react-router-dom';
import { questionsAPI, QuestionRead } from '@/lib/api/questions';
import NotificationDropdown from './NotificationDropdown';
import { authAPI } from '@/lib/api/auth';
import apiClient from '@/lib/api/client';

interface TopbarProps {
  onMenuToggle: () => void;
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { theme, setTheme } = useThemeStore();
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    apiClient.get('/gamification/me').then(r => {
      setStreak(r.data.data?.current_streak || 0);
    }).catch(() => {});
  }, []);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<QuestionRead[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // Proceed with local logout even if API call fails
    }
    logout();
    navigate('/login');
  };

  const handleThemeToggle = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await questionsAPI.list({ search: searchQuery, per_page: 5 });
        setSearchResults(res.data.data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine if dark mode is currently active (for icon display)
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-950 sm:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onMenuToggle}
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Search */}
      <div className="hidden flex-1 md:block md:max-w-md" ref={searchRef}>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search questions, topics..."
            className="input pl-10"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearch(true);
            }}
            onFocus={() => setShowSearch(true)}
          />

          {/* Search Results Dropdown */}
          {showSearch && searchQuery.length >= 3 && (
            <div className="absolute left-0 right-0 top-full mt-1 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
              {isSearching ? (
                <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">No questions found</div>
              ) : (
                searchResults.map((q) => (
                  <button
                    key={q.id}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => {
                      setShowSearch(false);
                      setSearchQuery('');
                      navigate(`/dashboard/questions/${q.id}`);
                    }}
                  >
                    <p className="line-clamp-2 text-sm text-gray-900 dark:text-white">
                      {q.question_text}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-gray-400">Difficulty: {q.difficulty}</span>
                      <span className="text-xs text-gray-400">{q.question_type.toUpperCase()}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {/* Streak indicator */}
        {streak > 0 && (
          <div className="hidden items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 sm:flex">
            <span>{streak}</span>
            <span className="text-xs">day streak</span>
          </div>
        )}

        {/* Dark mode toggle */}
        <button
          onClick={handleThemeToggle}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          title={`Theme: ${theme}`}
        >
          {isDark ? (
            // Moon icon (currently dark)
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          ) : (
            // Sun icon (currently light)
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          )}
        </button>

        {/* Notifications */}
        <NotificationDropdown />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Logout"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
        </button>
      </div>
    </header>
  );
}
