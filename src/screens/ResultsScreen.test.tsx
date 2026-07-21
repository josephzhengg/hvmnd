import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, test, expect, vi } from 'vitest';
import { ResultsScreen } from './ResultsScreen';
import { getScoreStore } from '../storage';
import { defaultConfig } from './ConfigScreen';
import type { Result } from '../engine/types';

beforeEach(() => localStorage.clear());

const result: Result = {
  signature: 'sig', mode: 'timed', correct: 15, attempts: 16,
  accuracy: 15 / 16, totalMs: 60000, avgMs: 3750, longestStreak: 9,
};

test('shows the score and submits with a display name', async () => {
  const onSubmitted = vi.fn();
  render(
    <ResultsScreen config={defaultConfig()} result={result}
      onSubmitted={onSubmitted} onViewLeaderboard={() => {}} onPlayAgain={() => {}} />,
  );
  expect(screen.getByText('15')).toBeInTheDocument();
  await userEvent.type(screen.getByPlaceholderText(/your name/i), 'Zed');
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
  await waitFor(() => expect(onSubmitted).toHaveBeenCalled());
  const board = await getScoreStore().getLeaderboard('sig', 'timed');
  expect(board[0].display_name).toBe('Zed');
});

test('submit is disabled until a name is entered', () => {
  render(
    <ResultsScreen config={defaultConfig()} result={result}
      onSubmitted={() => {}} onViewLeaderboard={() => {}} onPlayAgain={() => {}} />,
  );
  expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
});
