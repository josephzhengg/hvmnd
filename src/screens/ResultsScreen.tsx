import { useState } from 'react';
import { encodeChallenge } from '../engine/signature';
import { getScoreStore } from '../storage';
import type { Config, Result } from '../engine/types';

const NAME_KEY = 'hvmnd:name';

export function ResultsScreen({
  config,
  result,
  onSubmitted,
  onViewLeaderboard,
  onPlayAgain,
}: {
  config: Config;
  result: Result;
  onSubmitted: () => void;
  onViewLeaderboard: () => void;
  onPlayAgain: () => void;
}) {
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const submit = async () => {
    const display = name.trim().slice(0, 24);
    if (!display) return;
    setSubmitting(true);
    setError('');
    try {
      localStorage.setItem(NAME_KEY, display);
      await getScoreStore().submitScore({
        signature: result.signature,
        display_name: display,
        score: result.correct,
        accuracy: result.accuracy,
        total_ms: result.totalMs,
        mode: result.mode,
      });
      onSubmitted();
    } catch (e) {
      setError('Could not submit — your score is saved locally. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyChallenge = async () => {
    const link = `${location.origin}${location.pathname}#/play?c=${encodeChallenge(config)}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Copy failed — select and copy manually: ' + link);
    }
  };

  const secs = (result.totalMs / 1000).toFixed(1);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 p-4">
      <div className="text-center">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Score</div>
        <div className="text-7xl font-black text-indigo-600">{result.correct}</div>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Accuracy" value={`${Math.round(result.accuracy * 100)}%`} />
        <Stat label="Streak" value={String(result.longestStreak)} />
        <Stat label={result.mode === 'timed' ? 'Avg / q' : 'Time'} value={result.mode === 'timed' ? `${(result.avgMs / 1000).toFixed(1)}s` : `${secs}s`} />
      </dl>

      <div className="flex flex-col gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={24}
          className="h-12 rounded-xl border border-slate-300 px-4 text-lg dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <button type="button" disabled={!name.trim() || submitting} onClick={submit}
          className="h-12 rounded-xl bg-indigo-600 font-bold text-white disabled:opacity-40">
          {submitting ? 'Submitting…' : 'Submit to leaderboard'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={copyChallenge}
          className="h-12 rounded-xl bg-slate-100 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {copied ? 'Copied!' : 'Copy challenge link'}
        </button>
        <button type="button" onClick={onViewLeaderboard}
          className="h-12 rounded-xl bg-slate-100 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          Leaderboard
        </button>
      </div>

      <button type="button" onClick={onPlayAgain}
        className="h-14 rounded-2xl bg-indigo-600 text-lg font-bold text-white shadow-lg">
        Play again
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
      <dt className="text-xs font-medium text-slate-400">{label}</dt>
      <dd className="text-xl font-bold text-slate-800 dark:text-slate-100">{value}</dd>
    </div>
  );
}
