import { useCallback, useEffect, useState } from 'react';

export interface Preferences {
  theme: 'light' | 'dark';
  sound: boolean;
  numpad: boolean;
}

const KEY = 'hvmnd:prefs';

function initialPrefs(): Preferences {
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const fallback: Preferences = {
    theme: prefersDark ? 'dark' : 'light',
    sound: true,
    numpad: true,
  };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<Preferences>) } : fallback;
  } catch {
    return fallback;
  }
}

export function usePreferences() {
  const [prefs, setState] = useState<Preferences>(initialPrefs);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(prefs));
    document.documentElement.classList.toggle('dark', prefs.theme === 'dark');
  }, [prefs]);

  const setPrefs = useCallback((patch: Partial<Preferences>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  return { prefs, setPrefs };
}
