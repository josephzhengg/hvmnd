import { summarize, compareRank } from './scoring';
import type { Attempt, Problem } from './types';

const prob: Problem = { a: 1, b: 1, op: 'add', answer: 2, prompt: '1 + 1' };

function att(correct: boolean, ms: number): Attempt {
  return { problem: prob, given: correct ? 2 : 0, correct, elapsedMs: ms };
}

test('summarize computes counts, accuracy, timing, streak', () => {
  const attempts = [att(true, 1000), att(false, 500), att(true, 1000), att(true, 2000)];
  const r = summarize(attempts, 'timed', 'sig');
  expect(r.correct).toBe(3);
  expect(r.attempts).toBe(4);
  expect(r.accuracy).toBeCloseTo(0.75);
  expect(r.totalMs).toBe(4500);
  expect(r.avgMs).toBeCloseTo(4500 / 4);
  expect(r.longestStreak).toBe(2);
  expect(r.signature).toBe('sig');
});

test('summarize handles zero attempts', () => {
  const r = summarize([], 'fixed', 'sig');
  expect(r.correct).toBe(0);
  expect(r.accuracy).toBe(0);
  expect(r.avgMs).toBe(0);
});

test('timed ranking: higher score first, then accuracy, then faster', () => {
  expect(compareRank('timed', { score: 20, accuracy: 0.9, total_ms: 60000 },
                              { score: 18, accuracy: 1, total_ms: 60000 })).toBeLessThan(0);
  expect(compareRank('timed', { score: 20, accuracy: 0.8, total_ms: 60000 },
                              { score: 20, accuracy: 0.95, total_ms: 60000 })).toBeGreaterThan(0);
});

test('fixed ranking: higher score first, then faster total time', () => {
  expect(compareRank('fixed', { score: 20, accuracy: 1, total_ms: 30000 },
                              { score: 20, accuracy: 1, total_ms: 45000 })).toBeLessThan(0);
  expect(compareRank('fixed', { score: 19, accuracy: 1, total_ms: 10000 },
                              { score: 20, accuracy: 1, total_ms: 90000 })).toBeGreaterThan(0);
});
