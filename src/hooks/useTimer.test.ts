import { test, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimer } from './useTimer';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('counts down while running and reports done at zero', () => {
  const { result } = renderHook(() => useTimer(1, true));
  expect(result.current.remainingMs).toBe(1000);
  act(() => { vi.advanceTimersByTime(1000); });
  expect(result.current.remainingMs).toBe(0);
  expect(result.current.done).toBe(true);
});

test('does not advance while paused', () => {
  const { result } = renderHook(() => useTimer(2, false));
  act(() => { vi.advanceTimersByTime(1000); });
  expect(result.current.remainingMs).toBe(2000);
  expect(result.current.done).toBe(false);
});
