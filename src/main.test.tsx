import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// main.tsx runs when it is imported, so each test gets a fresh module and a fresh page.
async function boot() {
  vi.resetModules();
  await import('./main');
}

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  window.history.replaceState(null, '', '/');
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-theme');
});

describe('main (start-up)', () => {
  it('says what is missing instead of showing a blank page when VITE_API_URL is not set', async () => {
    vi.stubEnv('VITE_API_URL', '');

    await boot();

    expect(await screen.findByRole('heading', { name: 'The app is not set up' })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('VITE_API_URL is not set');
    expect(screen.getByRole('alert')).toHaveTextContent('build argument');
  });

  it('quotes an address that is not a web address', async () => {
    vi.stubEnv('VITE_API_URL', 'localhost:7054/api');

    await boot();

    expect(await screen.findByRole('alert')).toHaveTextContent('“localhost:7054/api”');
  });

  it('starts the real app when the address is fine: a visitor lands on the login page', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test/api');

    await boot();

    // The whole app is imported on demand and the machine may be busy with the other test files:
    // the default second is not always enough for that (it failed in most runs under load).
    expect(
      await screen.findByRole('heading', { name: 'Welcome back' }, { timeout: 10_000 }),
    ).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
