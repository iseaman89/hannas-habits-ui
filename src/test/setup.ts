import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only unmounts after each test by itself when the test runner exposes
// `afterEach` as a global; Vitest does not (no `globals: true`), so do it explicitly.
afterEach(() => {
  cleanup();
});

// jsdom has no modal <dialog> support (showModal/close are missing). Minimal stand-in: what the
// components rely on is the `open` attribute and the `close` event, not the top layer or focus
// trap, which are the browser's job.
if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

// jsdom has no matchMedia. The stand-in answers "no, the system does not prefer dark", so the
// theme falls back to light; tests that care inject their own (see systemTheme in shared/lib).
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  });
}
