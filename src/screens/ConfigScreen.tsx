import { useState } from 'react';
import { OperationToggle } from '../components/OperationToggle';
import { rangesForDifficulty } from '../engine/problems';
import { OPERATIONS, type Config, type Difficulty, type Mode, type Operation } from '../engine/types';
import type { Preferences } from '../hooks/usePreferences';

export function defaultConfig(): Config {
  return {
    operations: ['add', 'sub', 'mul', 'div'],
    difficulty: 'medium',
    ranges: rangesForDifficulty('medium'),
    allowNegatives: false,
    mode: 'timed',
    durationSec: 60,
    problemCount: 20,
    seed: Math.floor(Math.random() * 2 ** 31),
  };
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const DURATIONS = [30, 60, 120];
const COUNTS = [10, 20, 50];

export function ConfigScreen({
  initial,
  prefs,
  setPrefs,
  onStart,
}: {
  initial: Config;
  prefs: Preferences;
  setPrefs: (p: Partial<Preferences>) => void;
  onStart: (config: Config) => void;
}) {
  const [config, setConfig] = useState<Config>(initial);
  const canStart = config.operations.length > 0;

  const toggleOp = (op: Operation) => {
    setConfig((c) => ({
      ...c,
      operations: c.operations.includes(op)
        ? c.operations.filter((o) => o !== op)
        : [...c.operations, op],
    }));
  };

  const pickDifficulty = (d: Difficulty) =>
    setConfig((c) => ({ ...c, difficulty: d, ranges: rangesForDifficulty(d) }));

  const start = () =>
    onStart({ ...config, seed: Math.floor(Math.random() * 2 ** 31) });

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">hvmnd</h1>
        <button
          type="button"
          aria-label="Toggle theme"
          onClick={() => setPrefs({ theme: prefs.theme === 'dark' ? 'light' : 'dark' })}
          className="rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800 dark:text-slate-200"
        >
          {prefs.theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Operations</h2>
        <div className="grid grid-cols-4 gap-2">
          {OPERATIONS.map((op) => (
            <OperationToggle key={op} op={op} active={config.operations.includes(op)} onToggle={toggleOp} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Difficulty</h2>
        <div className="grid grid-cols-3 gap-2">
          {DIFFICULTIES.map((d) => (
            <button key={d} type="button" onClick={() => pickDifficulty(d)}
              className={`h-11 rounded-lg text-sm font-semibold capitalize ${
                config.difficulty === d ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}>
              {d}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Mode</h2>
        <div className="mb-2 grid grid-cols-2 gap-2">
          {(['timed', 'fixed'] as Mode[]).map((m) => (
            <button key={m} type="button" onClick={() => setConfig((c) => ({ ...c, mode: m }))}
              className={`h-11 rounded-lg text-sm font-semibold ${
                config.mode === m ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}>
              {m === 'timed' ? 'Timed' : 'Fixed count'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(config.mode === 'timed' ? DURATIONS : COUNTS).map((v) => {
            const active = config.mode === 'timed' ? config.durationSec === v : config.problemCount === v;
            return (
              <button key={v} type="button"
                onClick={() =>
                  setConfig((c) => (c.mode === 'timed' ? { ...c, durationSec: v } : { ...c, problemCount: v }))
                }
                className={`h-11 rounded-lg text-sm font-semibold ${
                  active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                {config.mode === 'timed' ? `${v}s` : `${v}`}
              </button>
            );
          })}
        </div>
      </section>

      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input type="checkbox" checked={config.allowNegatives}
          onChange={(e) => setConfig((c) => ({ ...c, allowNegatives: e.target.checked }))} />
        Allow negative results in subtraction
      </label>

      <button type="button" disabled={!canStart} onClick={start}
        className="h-14 rounded-2xl bg-indigo-600 text-lg font-bold text-white shadow-lg disabled:opacity-40">
        Start
      </button>
    </div>
  );
}
