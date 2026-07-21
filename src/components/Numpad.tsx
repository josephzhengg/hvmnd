const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'enter'] as const;

export function Numpad({
  onDigit,
  onClear,
  onSubmit,
}: {
  onDigit: (d: string) => void;
  onClear: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 select-none">
      {KEYS.map((k) => {
        if (k === 'clear') {
          return (
            <button key={k} type="button" aria-label="Clear" onClick={onClear}
              className="h-16 rounded-xl bg-slate-200 text-lg font-semibold text-slate-700 active:scale-95 dark:bg-slate-700 dark:text-slate-200">
              ⌫
            </button>
          );
        }
        if (k === 'enter') {
          return (
            <button key={k} type="button" aria-label="Enter" onClick={onSubmit}
              className="h-16 rounded-xl bg-indigo-600 text-lg font-semibold text-white active:scale-95">
              ⏎
            </button>
          );
        }
        return (
          <button key={k} type="button" aria-label={k} onClick={() => onDigit(k)}
            className="h-16 rounded-xl bg-white text-2xl font-semibold text-slate-900 shadow-sm active:scale-95 dark:bg-slate-800 dark:text-slate-100">
            {k}
          </button>
        );
      })}
    </div>
  );
}
