import { OP_SYMBOL, type Operation } from '../engine/types';

const LABEL: Record<Operation, string> = {
  add: 'Addition',
  sub: 'Subtraction',
  mul: 'Multiplication',
  div: 'Division',
};

export function OperationToggle({
  op,
  active,
  onToggle,
}: {
  op: Operation;
  active: boolean;
  onToggle: (op: Operation) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={LABEL[op]}
      onClick={() => onToggle(op)}
      className={`flex h-16 items-center justify-center rounded-xl text-3xl font-bold transition ${
        active
          ? 'bg-indigo-600 text-white shadow'
          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
      }`}
    >
      {OP_SYMBOL[op]}
    </button>
  );
}
