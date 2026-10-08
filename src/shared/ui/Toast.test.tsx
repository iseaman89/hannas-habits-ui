import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from './ToastProvider';
import { useToast } from './toast-context';

function Trigger() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.success('Habit created')}>success</button>
      <button onClick={() => toast.error('Could not save')}>error</button>
      <button onClick={() => toast.info('Heads up')}>info</button>
    </>
  );
}

function renderToasts() {
  render(
    <ToastProvider>
      <Trigger />
    </ToastProvider>,
  );
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a message as a status', async () => {
    renderToasts();

    await userEvent.click(screen.getByText('success'));

    expect(screen.getByRole('status')).toHaveTextContent('Habit created');
  });

  it('announces an error as an alert', async () => {
    renderToasts();

    await userEvent.click(screen.getByText('error'));

    expect(screen.getByRole('alert')).toHaveTextContent('Could not save');
  });

  it('disappears by itself, errors later than the rest', async () => {
    renderToasts();
    await userEvent.click(screen.getByText('success'));
    await userEvent.click(screen.getByText('error'));

    act(() => {
      vi.advanceTimersByTime(4100);
    });
    expect(screen.queryByText('Habit created')).not.toBeInTheDocument();
    expect(screen.getByText('Could not save')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText('Could not save')).not.toBeInTheDocument();
  });

  it('can be dismissed', async () => {
    renderToasts();
    await userEvent.click(screen.getByText('success'));

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(screen.queryByText('Habit created')).not.toBeInTheDocument();
  });

  it('keeps at most three, dropping the oldest', async () => {
    renderToasts();

    await userEvent.click(screen.getByText('success'));
    await userEvent.click(screen.getByText('error'));
    await userEvent.click(screen.getByText('info'));
    await userEvent.click(screen.getByText('info'));

    expect(screen.queryByText('Habit created')).not.toBeInTheDocument();
    expect(screen.getAllByText('Heads up')).toHaveLength(2);
    expect(screen.getByText('Could not save')).toBeInTheDocument();
  });

  it('needs a provider', () => {
    // React logs the render error and jsdom reports it as an uncaught `error` event: silence both.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const swallow = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener('error', swallow);

    try {
      expect(() => render(<Trigger />)).toThrow('useToast must be used inside a <ToastProvider>');
    } finally {
      window.removeEventListener('error', swallow);
    }
  });
});
