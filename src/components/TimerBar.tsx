export function TimerBar({ remainingMs, totalMs }: { remainingMs: number; totalMs: number }) {
  const pct = totalMs > 0 ? Math.max(0, Math.min(100, (remainingMs / totalMs) * 100)) : 0;
  const seconds = Math.ceil(remainingMs / 1000);
  return (
    <div className="w-full">
      <div className="mb-1 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
        {seconds}s
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-full rounded-full bg-indigo-500 transition-[width] duration-100 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
