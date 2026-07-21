import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Numpad } from './Numpad';

test('numpad reports digit, clear, and submit presses', async () => {
  const onDigit = vi.fn();
  const onClear = vi.fn();
  const onSubmit = vi.fn();
  render(<Numpad onDigit={onDigit} onClear={onClear} onSubmit={onSubmit} />);
  await userEvent.click(screen.getByRole('button', { name: '7' }));
  expect(onDigit).toHaveBeenCalledWith('7');
  await userEvent.click(screen.getByRole('button', { name: /clear/i }));
  expect(onClear).toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: /enter/i }));
  expect(onSubmit).toHaveBeenCalled();
});
