import { useLeaderboard } from '../hooks/useLeaderboard';
import type { Mode } from '../engine/types';

export function LeaderboardScreen({
  signature,
  mode,
  isRemote,
  onBack,
}: {
  signature: string;
  mode: Mode;
  isRemote: boolean;
  onBack: () => void;
}) {
  const { rows, loading } = useLeaderboard(signature, mode);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm font-semibold text-indigo-600">‹ Back</button>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Leaderboard</h2>
        {!isRemote && (
          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Local only</span>
        )}
        {isRemote && <span className="w-16" />}
      </header>

      <p className="text-center text-xs text-slate-400">{signature}</p>

      {loading ? (
        <p className="text-center text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-center text-slate-500">No scores yet — be the first!</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
              <span className="w-6 text-right font-bold text-slate-400">{i + 1}</span>
              <span data-testid="lb-name" className="flex-1 font-semibold text-slate-800 dark:text-slate-100">{r.display_name}</span>
              <span className="font-mono tabular-nums font-bold text-indigo-600">{r.score}</span>
              <span className="w-12 text-right text-xs text-slate-400">{Math.round(r.accuracy * 100)}%</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
