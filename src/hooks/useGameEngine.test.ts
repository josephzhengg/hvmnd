import { test, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameEngine } from './useGameEngine';
import { rangesForDifficulty } from '../engine/problems';
import type { Config } from '../engine/types';

function cfg(over: Partial<Config> = {}): Config {
  return {
    operations: ['add'],
    difficulty: 'easy',
    ranges: rangesForDifficulty('easy'),
    allowNegatives: false,
    mode: 'fixed',
    durationSec: 60,
    problemCount: 3,
    seed: 1,
    ...over,
  };
}

test('correct submit advances and increments correct count', () => {
  const { result } = renderHook(() => useGameEngine(cfg()));
  act(() => result.current.start());
  const answer = result.current.current!.answer;
  act(() => result.current.setInput(String(answer)));
  act(() => result.current.submit());
  expect(result.current.attempts[0].correct).toBe(true);
  expect(result.current.count).toBe(1);
});

test('wrong submit counts as incorrect and still advances', () => {
  const { result } = renderHook(() => useGameEngine(cfg()));
  act(() => result.current.start());
  const wrong = result.current.current!.answer + 1;
  act(() => result.current.setInput(String(wrong)));
  act(() => result.current.submit());
  expect(result.current.attempts[0].correct).toBe(false);
  expect(result.current.count).toBe(1);
});

test('fixed mode finishes after problemCount attempts and produces a result', () => {
  const { result } = renderHook(() => useGameEngine(cfg({ problemCount: 2 })));
  act(() => result.current.start());
  for (let i = 0; i < 2; i++) {
    const a = result.current.current!.answer;
    act(() => result.current.setInput(String(a)));
    act(() => result.current.submit());
  }
  expect(result.current.finished).toBe(true);
  expect(result.current.result?.correct).toBe(2);
});
