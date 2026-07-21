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

test('the sign-toggle key is shown only when onMinus is provided and fires it', async () => {
  const noop = () => {};
  const { rerender } = render(<Numpad onDigit={noop} onClear={noop} onSubmit={noop} />);
  expect(screen.queryByRole('button', { name: /toggle sign/i })).not.toBeInTheDocument();

  const onMinus = vi.fn();
  rerender(<Numpad onDigit={noop} onClear={noop} onSubmit={noop} onMinus={onMinus} />);
  await userEvent.click(screen.getByRole('button', { name: /toggle sign/i }));
  expect(onMinus).toHaveBeenCalled();
});
