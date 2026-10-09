import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useElementWidth } from './useElementWidth';

let widthNow = 300;
let observers: Array<() => void> = [];
let disconnected = 0;

class FakeResizeObserver {
  constructor(private readonly callback: () => void) {}
  observe() {
    observers.push(this.callback);
  }
  disconnect() {
    disconnected++;
  }
  unobserve() {}
}

function Probe() {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  return (
    <div ref={ref} data-testid="box">
      {String(width)}
    </div>
  );
}

beforeEach(() => {
  widthNow = 300;
  observers = [];
  disconnected = 0;
  Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
    return { width: widthNow } as DOMRect;
  };
});

afterEach(() => {
  // @ts-expect-error - removing the stand-in again
  delete globalThis.ResizeObserver;
  // @ts-expect-error - removing the stand-in again
  delete Element.prototype.getBoundingClientRect;
});

describe('useElementWidth', () => {
  it('measures at once, follows the element, and stops watching when it goes', () => {
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;

    const { unmount } = render(<Probe />);
    expect(screen.getByTestId('box')).toHaveTextContent('300');

    widthNow = 241.7;
    act(() => observers.forEach((notify) => notify()));
    expect(screen.getByTestId('box')).toHaveTextContent('241');

    unmount();
    expect(disconnected).toBe(1);
  });

  it('stays null where the browser cannot observe sizes', () => {
    render(<Probe />);

    expect(screen.getByTestId('box')).toHaveTextContent('null');
  });
});
