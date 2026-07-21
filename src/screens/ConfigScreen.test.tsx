import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigScreen, defaultConfig } from './ConfigScreen';

const prefs = { theme: 'light' as const, sound: true, numpad: true };

test('start is disabled when no operations selected, enabled otherwise', async () => {
  const onStart = vi.fn();
  const initial = { ...defaultConfig(), operations: [] };
  render(<ConfigScreen initial={initial} prefs={prefs} setPrefs={() => {}} onStart={onStart} />);
  const start = screen.getByRole('button', { name: /start/i });
  expect(start).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: /addition/i }));
  expect(start).toBeEnabled();
});

test('clicking start emits a config with the chosen operations', async () => {
  const onStart = vi.fn();
  render(<ConfigScreen initial={defaultConfig()} prefs={prefs} setPrefs={() => {}} onStart={onStart} />);
  await userEvent.click(screen.getByRole('button', { name: /start/i }));
  expect(onStart).toHaveBeenCalledTimes(1);
  expect(onStart.mock.calls[0][0].operations.length).toBeGreaterThan(0);
});
