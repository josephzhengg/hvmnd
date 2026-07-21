import { useEffect, useMemo, useState } from 'react';
import { ConfigScreen, defaultConfig } from './screens/ConfigScreen';
import { TrialScreen } from './screens/TrialScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { usePreferences } from './hooks/usePreferences';
import { decodeChallenge, modeSignature } from './engine/signature';
import { isRemoteConfigured } from './storage';
import type { Config, Result } from './engine/types';

type Screen = 'config' | 'trial' | 'results' | 'leaderboard';

function challengeFromHash(): Config | null {
  const m = window.location.hash.match(/#\/play\?c=([^&]+)/);
  return m ? decodeChallenge(decodeURIComponent(m[1])) : null;
}

export default function App() {
  const { prefs, setPrefs } = usePreferences();
  const [screen, setScreen] = useState<Screen>('config');
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    const challenge = challengeFromHash();
    if (challenge) {
      setConfig(challenge);
      setScreen('trial');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const signature = useMemo(() => modeSignature(config), [config]);

  return (
    <div className="min-h-full bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
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
          mode={config.mode}
          isRemote={isRemoteConfigured}
          onBack={() => setScreen(result ? 'results' : 'config')}
        />
      )}
    </div>
  );
}
