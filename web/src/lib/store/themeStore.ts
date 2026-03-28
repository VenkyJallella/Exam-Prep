import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem('theme') as Theme | null;
  return stored && ['light', 'dark', 'system'].includes(stored) ? stored : 'system';
}

export const useThemeStore = create<ThemeState>((set) => {
  const initial = getInitialTheme();

  // Apply on init
  applyTheme(initial);

  // Listen for system preference changes when theme is 'system'
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    const current = useThemeStore.getState().theme;
    if (current === 'system') {
      applyTheme('system');
    }
  });

  return {
    theme: initial,
    setTheme: (theme: Theme) => {
      localStorage.setItem('theme', theme);
      applyTheme(theme);
      set({ theme });
    },
  };
});
