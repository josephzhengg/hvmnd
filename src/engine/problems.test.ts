import { makeProblem, createProblemGenerator, rangesForDifficulty } from './problems';
import { mulberry32 } from './rng';
import type { Config } from './types';

function cfg(over: Partial<Config> = {}): Config {
  return {
    operations: ['add', 'sub', 'mul', 'div'],
    difficulty: 'medium',
    ranges: rangesForDifficulty('medium'),
    allowNegatives: false,
    mode: 'timed',
    durationSec: 60,
    problemCount: 20,
    seed: 7,
    ...over,
  };
}

test('division always yields whole answers and divisor >= 1', () => {
  const rng = mulberry32(1);
  for (let i = 0; i < 300; i++) {
    const p = makeProblem('div', cfg(), rng);
    expect(p.b).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(p.answer)).toBe(true);
    expect(p.a).toBe(p.b * p.answer);
  }
});

test('subtraction is non-negative when allowNegatives is false', () => {
  const rng = mulberry32(2);
  for (let i = 0; i < 300; i++) {
    const p = makeProblem('sub', cfg({ allowNegatives: false }), rng);
    expect(p.answer).toBeGreaterThanOrEqual(0);
  }
});

test('addition answer equals a + b and prompt uses the operator symbol', () => {
  const rng = mulberry32(3);
  const p = makeProblem('add', cfg(), rng);
  expect(p.answer).toBe(p.a + p.b);
  expect(p.prompt).toContain('+');
});

test('generator is deterministic for a given seed', () => {
  const g1 = createProblemGenerator(cfg({ seed: 555 }));
  const g2 = createProblemGenerator(cfg({ seed: 555 }));
  const s1 = [g1.next(), g1.next(), g1.next()].map((p) => p.prompt);
  const s2 = [g2.next(), g2.next(), g2.next()].map((p) => p.prompt);
  expect(s1).toEqual(s2);
});

test('generator never repeats the immediately previous prompt', () => {
  const g = createProblemGenerator(cfg({ operations: ['add'] }));
  let prev = '';
  for (let i = 0; i < 100; i++) {
    const p = g.next();
    expect(p.prompt).not.toBe(prev);
    prev = p.prompt;
  }
});

test('only enabled operations appear', () => {
  const g = createProblemGenerator(cfg({ operations: ['mul'] }));
  for (let i = 0; i < 50; i++) expect(g.next().op).toBe('mul');
});
