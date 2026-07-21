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
    if (!raw) return fallback;
    const merged = { ...fallback, ...(JSON.parse(raw) as Partial<Preferences>) };
    if (merged.theme !== 'light' && merged.theme !== 'dark') merged.theme = fallback.theme;
    return merged;
  } catch {
    return fallback;
  }
}

export function usePreferences() {
  const [prefs, setState] = useState<Preferences>(initialPrefs);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      // Ignore storage write failures (quota/private mode); theme still applies.
    }
    document.documentElement.classList.toggle('dark', prefs.theme === 'dark');
  }, [prefs]);

  const setPrefs = useCallback((patch: Partial<Preferences>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  return { prefs, setPrefs };
}
