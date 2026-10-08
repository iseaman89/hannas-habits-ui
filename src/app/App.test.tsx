import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSession, signedIn, signedOut } from '@/test/fakeSession';
import { App } from './App';
import { routes } from './routes';

function renderApp(state: typeof signedOut, at: string) {
  const session = fakeSession(state);
  const router = createMemoryRouter(routes, { initialEntries: [at] });
  render(<App session={session} router={router} />);
  return { session, router };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('the app skeleton', () => {
  it('sends a visitor who is not signed in to the login page, whatever they asked for', () => {
    const { router } = renderApp(signedOut, '/habits');

    expect(router.state.location.pathname).toBe('/login');
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
  });

  // Just after midnight and just before midnight, local time: in any time zone except UTC one of
  // the two is on a different calendar day in UTC, so a date from toISOString() would be wrong.
  it.each([
    [new Date(2026, 9, 8, 0, 30), '/diary/2026-10-08'],
    [new Date(2026, 9, 7, 23, 30), '/diary/2026-10-07'],
  ])("opens the diary of the client's local today (%s)", (now, expected) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);

    const { router } = renderApp(signedIn, '/');

    expect(router.state.location.pathname).toBe(expected);
  });

  it('shows the shell with the four screens, the person and the theme switch', () => {
    renderApp(signedIn, '/habits');

    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Today', 'Habits', 'Calendar', 'Resolutions']);
    expect(within(nav).getByRole('link', { name: 'Habits' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Today' })).not.toHaveAttribute('aria-current');
    expect(screen.getByText('Hanna')).toBeInTheDocument();
    expect(screen.getByText('hanna@example.com')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Colour theme' })).toBeInTheDocument();
  });

  it('marks Today as current on every diary day, not only on the real today', () => {
    renderApp(signedIn, '/diary/2026-01-15');

    expect(screen.getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { name: '2026-01-15' })).toBeInTheDocument();
  });

  it('navigates between the screens', async () => {
    const { router } = renderApp(signedIn, '/habits');

    await userEvent.click(screen.getByRole('link', { name: 'Calendar' }));
    expect(router.state.location.pathname).toBe('/calendar');
    expect(screen.getByRole('heading', { name: 'Calendar' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: 'Resolutions' }));
    expect(router.state.location.pathname).toBe('/resolutions');
  });

  it('says so for an address that does not exist, inside the shell', () => {
    renderApp(signedIn, '/nothing-here');

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  });

  it('keeps a signed-in person off the login page', () => {
    const { router } = renderApp(signedIn, '/login');

    expect(router.state.location.pathname).toMatch(/^\/diary\//);
  });

  it('logs out through the session, and the login page follows', async () => {
    const { session, router } = renderApp(signedIn, '/habits');

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(session.endCalls).toBe(1);

    // What the real session does: it announces that nobody is signed in any more.
    act(() => session.set(signedOut));
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('has one theme for the whole app: the switch in the sidebar changes the page', async () => {
    renderApp(signedIn, '/habits');

    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));

    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
