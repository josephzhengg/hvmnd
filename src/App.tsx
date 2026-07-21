import { useEffect, useMemo, useState } from 'react';
import { ConfigScreen, defaultConfig } from './screens/ConfigScreen';
import { TrialScreen } from './screens/TrialScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { usePreferences } from './hooks/usePreferences';
import { decodeChallenge, describeConfig, modeSignature } from './engine/signature';
import { isRemoteConfigured } from './storage';
import type { Config, Result } from './engine/types';

type Screen = 'config' | 'trial' | 'results' | 'leaderboard';

function challengeFromHash(): Config | null {
  const m = window.location.hash.match(/#\/play\?c=([^&]+)/);
  if (!m) return null;
  try {
    return decodeChallenge(decodeURIComponent(m[1]));
  } catch {
    return null;
  }
}

export default function App() {
  const { prefs, setPrefs } = usePreferences();
  const [screen, setScreen] = useState<Screen>('config');
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [result, setResult] = useState<Result | null>(null);
  const [badLink, setBadLink] = useState(false);

  useEffect(() => {
    const hadParam = /#\/play\?c=/.test(window.location.hash);
    const challenge = challengeFromHash();
    if (challenge) {
      setConfig(challenge);
      setScreen('trial');
    } else if (hadParam) {
      setBadLink(true);
    }
    if (hadParam) window.history.replaceState(null, '', window.location.pathname);
  }, []);

  const signature = useMemo(() => modeSignature(config), [config]);

  return (
    <div className="min-h-full bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {screen === 'config' && badLink && (
        <div className="mx-auto max-w-md px-4 pt-4">
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800"
          >
            <span>That challenge link was invalid — start a fresh trial below.</span>
            <button
              type="button"
              onClick={() => setBadLink(false)}
              className="font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {screen === 'config' && (
        <ConfigScreen
          initial={config}
          prefs={prefs}
          setPrefs={setPrefs}
          onStart={(c) => {
            setConfig(c);
            setScreen('trial');
          }}
        />
      )}

      {screen === 'trial' && (
        <TrialScreen
          config={config}
          prefs={prefs}
          onFinish={(r) => {
            setResult(r);
            setScreen('results');
          }}
        />
      )}

      {screen === 'results' && result && (
        <ResultsScreen
          config={config}
          result={result}
          onSubmitted={() => setScreen('leaderboard')}
          onViewLeaderboard={() => setScreen('leaderboard')}
          onPlayAgain={() => setScreen('config')}
        />
      )}

      {screen === 'leaderboard' && (
        <LeaderboardScreen
          signature={signature}
          label={describeConfig(config)}
          mode={config.mode}
          isRemote={isRemoteConfigured}
          onBack={() => setScreen(result ? 'results' : 'config')}
        />
      )}
    </div>
  );
}
