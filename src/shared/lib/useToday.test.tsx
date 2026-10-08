import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toApiDate } from './dates';
import { useToday } from './useToday';

function Today() {
  const today = useToday();
  return <p data-testid="today">{toApiDate(today)}</p>;
}

const shown = () => screen.getByTestId('today').textContent;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useToday', () => {
  it('is the local day, as local midnight', () => {
    vi.setSystemTime(new Date(2026, 9, 7, 15, 30));
    render(<Today />);

    expect(shown()).toBe('2026-10-07');
  });

  it('turns to the next day by itself at midnight', () => {
    vi.setSystemTime(new Date(2026, 9, 7, 23, 59, 50));
    render(<Today />);
    expect(shown()).toBe('2026-10-07');

    act(() => {
      vi.advanceTimersByTime(9_000);
    });
    expect(shown()).toBe('2026-10-07'); // not yet: ten seconds to go, minus nine

    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(shown()).toBe('2026-10-08');
  });

  it('keeps counting: the day after that too', () => {
    vi.setSystemTime(new Date(2026, 9, 7, 23, 59, 50));
    render(<Today />);

    act(() => {
      vi.advanceTimersByTime(24 * 3_600_000 + 11_000);
    });

    expect(shown()).toBe('2026-10-09');
  });

  // A laptop that slept over midnight, or a background tab whose timer was frozen: no timer
  // fired, but the tab coming to the front must catch up.
  it('catches up when the tab comes back to the front', () => {
    vi.setSystemTime(new Date(2026, 9, 7, 22, 0));
    render(<Today />);

    vi.setSystemTime(new Date(2026, 9, 8, 7, 0)); // the clock jumped, no timer ran
    expect(shown()).toBe('2026-10-07');

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(shown()).toBe('2026-10-08');
  });

  it('catches up when the window gets the focus back', () => {
    vi.setSystemTime(new Date(2026, 9, 7, 22, 0));
    render(<Today />);

    vi.setSystemTime(new Date(2026, 9, 8, 7, 0));
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(shown()).toBe('2026-10-08');
  });

  it('does not render again while the day stays the same', () => {
    vi.setSystemTime(new Date(2026, 9, 7, 8, 0));
    let renders = 0;
    function Counting() {
      useToday();
      renders++;
      return null;
    }
    render(<Counting />);
    const before = renders;

    act(() => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(3_600_000);
    });

    expect(renders).toBe(before);
  });

  it('stops listening and cancels its timer when the screen goes', () => {
    vi.setSystemTime(new Date(2026, 9, 7, 8, 0));
    const { unmount } = render(<Today />);
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);

    // A listener that was left behind would arm a new timer when the tab or window wakes up.
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
    expect(vi.getTimerCount()).toBe(0);
  });
});
