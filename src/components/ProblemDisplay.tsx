export function ProblemDisplay({ prompt }: { prompt: string }) {
  return (
    <div className="text-center font-mono tabular-nums text-5xl sm:text-7xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
      {prompt}
    </div>
  );
}
