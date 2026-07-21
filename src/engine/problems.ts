import { randInt, mulberry32 } from './rng';
import { OP_SYMBOL } from './types';
import type { Config, Difficulty, Operation, OpRange, Problem } from './types';

export const PRESET_RANGES: Record<
  Exclude<Difficulty, 'custom'>,
  Record<Operation, OpRange>
> = {
  easy: {
    add: { min: 1, max: 10 },
    sub: { min: 1, max: 10 },
    mul: { min: 1, max: 10 },
    div: { min: 1, max: 10 },
  },
  medium: {
    add: { min: 1, max: 20 },
    sub: { min: 1, max: 20 },
    mul: { min: 2, max: 12 },
    div: { min: 2, max: 12 },
  },
  hard: {
    add: { min: 1, max: 100 },
    sub: { min: 1, max: 100 },
    mul: { min: 2, max: 20 },
    div: { min: 2, max: 20 },
  },
};

export function rangesForDifficulty(difficulty: Difficulty): Record<Operation, OpRange> {
  if (difficulty === 'custom') return { ...PRESET_RANGES.medium };
  return { ...PRESET_RANGES[difficulty] };
}

export function makeProblem(op: Operation, config: Config, rng: () => number): Problem {
  const r = config.ranges[op];
  let a: number;
  let b: number;
  let answer: number;

  switch (op) {
    case 'add': {
      a = randInt(rng, r.min, r.max);
      b = randInt(rng, r.min, r.max);
      answer = a + b;
      break;
    }
    case 'sub': {
      a = randInt(rng, r.min, r.max);
      b = randInt(rng, r.min, r.max);
      if (!config.allowNegatives && b > a) [a, b] = [b, a];
      answer = a - b;
      break;
    }
    case 'mul': {
      a = randInt(rng, r.min, r.max);
      b = randInt(rng, r.min, r.max);
      answer = a * b;
      break;
    }
    case 'div': {
      const divisor = randInt(rng, Math.max(1, r.min), Math.max(1, r.max));
      const quotient = randInt(rng, r.min, r.max);
      a = divisor * quotient;
      b = divisor;
      answer = quotient;
      break;
    }
  }

  return { a, b, op, answer, prompt: `${a} ${OP_SYMBOL[op]} ${b}` };
}

export function createProblemGenerator(config: Config): { next: () => Problem } {
  const rng = mulberry32(config.seed);
  const ops = config.operations.length > 0 ? config.operations : (['add'] as Operation[]);
  let prevPrompt = '';
  return {
    next(): Problem {
      let p: Problem;
      let guard = 0;
      do {
        const op = ops[randInt(rng, 0, ops.length - 1)];
        p = makeProblem(op, config, rng);
        guard++;
      } while (p.prompt === prevPrompt && guard < 20);
      prevPrompt = p.prompt;
      return p;
    },
  };
}
