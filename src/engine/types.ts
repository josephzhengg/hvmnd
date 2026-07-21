export type Operation = 'add' | 'sub' | 'mul' | 'div';
export type Mode = 'timed' | 'fixed';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'custom';

export interface OpRange {
  min: number;
  max: number;
}

export interface Config {
  operations: Operation[];
  difficulty: Difficulty;
  ranges: Record<Operation, OpRange>;
  allowNegatives: boolean;
  mode: Mode;
  durationSec: number;   // used when mode === 'timed'
  problemCount: number;  // used when mode === 'fixed'
  seed: number;          // deterministic generation for challenge links
}

export interface Problem {
  a: number;
  b: number;
  op: Operation;
  answer: number;
  prompt: string; // e.g. "12 × 3"
}

export interface Attempt {
  problem: Problem;
  given: number;
  correct: boolean;
  elapsedMs: number;
}

export interface Result {
  signature: string;
  mode: Mode;
  correct: number;
  attempts: number;
  accuracy: number; // 0..1
  totalMs: number;
  avgMs: number;
  longestStreak: number;
}

export const OPERATIONS: Operation[] = ['add', 'sub', 'mul', 'div'];

export const OP_SYMBOL: Record<Operation, string> = {
  add: '+',
  sub: '−',
  mul: '×',
  div: '÷',
};
