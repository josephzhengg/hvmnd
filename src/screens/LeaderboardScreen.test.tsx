import { render, screen, waitFor, act } from '@testing-library/react';
import { beforeEach, test, expect } from 'vitest';
import { LeaderboardScreen } from './LeaderboardScreen';
import { getScoreStore } from '../storage';

beforeEach(() => localStorage.clear());

test('renders ranked rows for the signature and shows local-only badge', async () => {
  const store = getScoreStore();
  await store.submitScore({ signature: 'sig', display_name: 'Alice', score: 30, accuracy: 1, total_ms: 60000, mode: 'timed' });
  await store.submitScore({ signature: 'sig', display_name: 'Bob', score: 12, accuracy: 1, total_ms: 60000, mode: 'timed' });
  render(<LeaderboardScreen signature="sig" mode="timed" isRemote={false} onBack={() => {}} />);
  await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
  expect(screen.getByText(/local only/i)).toBeInTheDocument();
  const names = screen.getAllByTestId('lb-name').map((n) => n.textContent);
  expect(names).toEqual(['Alice', 'Bob']);
});

test('merges live-submitted scores into the ranked list in real time', async () => {
  const store = getScoreStore();
  render(<LeaderboardScreen signature="live" mode="timed" isRemote={false} onBack={() => {}} />);
  await screen.findByText(/be the first/i);

  await act(async () => {
    await store.submitScore({ signature: 'live', display_name: 'Lo', score: 5, accuracy: 1, total_ms: 60000, mode: 'timed' });
    await store.submitScore({ signature: 'live', display_name: 'Hi', score: 40, accuracy: 1, total_ms: 60000, mode: 'timed' });
  });

  await waitFor(() => expect(screen.getByText('Hi')).toBeInTheDocument());
  const names = screen.getAllByTestId('lb-name').map((n) => n.textContent);
  expect(names).toEqual(['Hi', 'Lo']);
});
