import { beforeEach, test, expect } from 'vitest';
import { LocalStore } from './LocalStore';

beforeEach(() => localStorage.clear());

test('submitScore stores and getLeaderboard returns ranked rows', async () => {
  const s = new LocalStore();
  await s.submitScore({ signature: 'sig', display_name: 'A', score: 10, accuracy: 1, total_ms: 60000, mode: 'timed' });
  await s.submitScore({ signature: 'sig', display_name: 'B', score: 20, accuracy: 1, total_ms: 60000, mode: 'timed' });
  const board = await s.getLeaderboard('sig', 'timed');
  expect(board.map((r) => r.display_name)).toEqual(['B', 'A']);
});

test('getPersonalBest returns the best row for the signature', async () => {
  const s = new LocalStore();
  await s.submitScore({ signature: 'sig', display_name: 'A', score: 10, accuracy: 1, total_ms: 60000, mode: 'timed' });
  await s.submitScore({ signature: 'sig', display_name: 'A', score: 25, accuracy: 1, total_ms: 60000, mode: 'timed' });
  const best = await s.getPersonalBest('sig', 'timed');
  expect(best?.score).toBe(25);
});

test('leaderboard is scoped by signature', async () => {
  const s = new LocalStore();
  await s.submitScore({ signature: 'sig1', display_name: 'A', score: 10, accuracy: 1, total_ms: 1, mode: 'timed' });
  await s.submitScore({ signature: 'sig2', display_name: 'B', score: 99, accuracy: 1, total_ms: 1, mode: 'timed' });
  const board = await s.getLeaderboard('sig1', 'timed');
  expect(board).toHaveLength(1);
  expect(board[0].display_name).toBe('A');
});

test('subscribeLeaderboard fires callback on new submit and unsubscribes cleanly', async () => {
  const s = new LocalStore();
  const seen: string[] = [];
  const unsub = s.subscribeLeaderboard('sig', 'timed', (row) => seen.push(row.display_name));
  await s.submitScore({ signature: 'sig', display_name: 'A', score: 10, accuracy: 1, total_ms: 1, mode: 'timed' });
  expect(seen).toEqual(['A']);
  unsub();
  await s.submitScore({ signature: 'sig', display_name: 'B', score: 10, accuracy: 1, total_ms: 1, mode: 'timed' });
  expect(seen).toEqual(['A']);
});
