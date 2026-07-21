import { useEffect } from 'react';
import { Numpad } from '../components/Numpad';
import { ProblemDisplay } from '../components/ProblemDisplay';
import { TimerBar } from '../components/TimerBar';
import { useGameEngine } from '../hooks/useGameEngine';
import { useTimer } from '../hooks/useTimer';
import type { Config, Result } from '../engine/types';
import type { Preferences } from '../hooks/usePreferences';

export function TrialScreen({
  config,
  prefs,
  onFinish,
}: {
  config: Config;
  prefs: Preferences;
  onFinish: (result: Result) => void;
}) {
  const engine = useGameEngine(config);
  const timer = useTimer(config.durationSec, engine.started && config.mode === 'timed');

  useEffect(() => {
    engine.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (config.mode === 'timed' && timer.done && engine.started) engine.finish();
  }, [config.mode, timer.done, engine]);

  useEffect(() => {
    if (engine.finished && engine.result) onFinish(engine.result);
  }, [engine.finished, engine.result, onFinish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') engine.setInput(engine.input + e.key);
      else if (e.key === 'Backspace') engine.setInput(engine.input.slice(0, -1));
      else if (e.key === 'Enter') engine.submit();
      else if (e.key === '-') engine.setInput(engine.input.startsWith('-') ? engine.input.slice(1) : '-' + engine.input);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engine]);

  const total = config.mode === 'timed' ? config.durationSec * 1000 : 0;
  const progress =
    config.mode === 'timed'
      ? `${engine.count} solved`
      : `${engine.count} / ${config.problemCount}`;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-6 p-4">
      {config.mode === 'timed' ? (
        <TimerBar remainingMs={timer.remainingMs} totalMs={total} />
      ) : (
        <div className="text-center text-sm font-medium text-slate-500">{progress}</div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div data-testid="prompt">
          <ProblemDisplay prompt={engine.current?.prompt ?? ''} />
        </div>
        <div className="h-14 min-w-[8rem] rounded-xl border-2 border-slate-300 px-4 text-center text-4xl font-bold leading-[3.25rem] text-slate-900 dark:border-slate-600 dark:text-slate-50">
          {engine.input || ' '}
        </div>
        {config.mode === 'timed' && (
          <div className="text-sm font-medium text-slate-500">{progress}</div>
        )}
      </div>

      {prefs.numpad && (
        <Numpad
          onDigit={(d) => engine.setInput(engine.input + d)}
          onClear={() => engine.setInput(engine.input.slice(0, -1))}
          onSubmit={engine.submit}
        />
      )}
    </div>
  );
}
