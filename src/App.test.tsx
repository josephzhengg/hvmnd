import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, test, expect } from 'vitest';
import App from './App';

beforeEach(() => localStorage.clear());

test('shows config screen with a Start button by default', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
});

test('starting a trial hides the Start button and shows a problem', async () => {
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: /start/i }));
  expect(screen.queryByRole('button', { name: /^start$/i })).not.toBeInTheDocument();
  expect(screen.getByTestId('prompt')).toBeInTheDocument();
});
