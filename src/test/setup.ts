import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only unmounts after each test by itself when the test runner exposes
// `afterEach` as a global; Vitest does not (no `globals: true`), so do it explicitly.
afterEach(() => {
  cleanup();
});
