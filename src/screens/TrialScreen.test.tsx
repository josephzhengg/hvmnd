import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrialScreen } from './TrialScreen';
import { defaultConfig } from './ConfigScreen';
import type { Config } from '../engine/types';

const prefs = { theme: 'light' as const, sound: false, numpad: true };

test('fixed-count trial finishes and reports a result', async () => {
  const config = { ...defaultConfig(), operations: ['add'] as const, mode: 'fixed' as const, problemCount: 1 } as unknown as Config;
  const onFinish = vi.fn();
  render(<TrialScreen config={config} prefs={prefs} onFinish={onFinish} />);
  // read the shown prompt, compute the answer, submit via keyboard
  const promptEl = await screen.findByTestId('prompt');
  const [a, , b] = promptEl.textContent!.split(' ');
  await userEvent.keyboard(`${Number(a) + Number(b)}{Enter}`);
  await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
  expect(onFinish.mock.calls[0][0].correct).toBe(1);
});
