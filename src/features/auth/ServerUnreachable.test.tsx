import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '@/shared/ui';
import { fakeSession, signedIn, unreachable } from '@/test/fakeSession';
import { AuthProvider } from './AuthProvider';
import { PublicOnly, RequireAuth } from './guards';

function setup(at: string) {
  const session = fakeSession(unreachable);
  const router = createMemoryRouter(
    [
      { element: <PublicOnly />, children: [{ path: '/login', element: <p>login page</p> }] },
      { element: <RequireAuth />, children: [{ path: '/habits', element: <p>habits</p> }] },
    ],
    { initialEntries: [at] },
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <AuthProvider session={session}>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { session, router };
}

describe('when the stored session could not be checked for lack of a server', () => {
  it.each(['/habits', '/login'])(
    'says so on %s - neither the app nor a login form for somebody who is probably signed in',
    (at) => {
      const { router } = setup(at);

      expect(screen.getByRole('heading', { name: "We can't reach the server" })).toBeVisible();
      expect(screen.getByRole('alert')).toHaveTextContent('You are still signed in');
      expect(screen.queryByText('habits')).not.toBeInTheDocument();
      expect(screen.queryByText('login page')).not.toBeInTheDocument();
      // And it did not send them anywhere: the address they asked for stays.
      expect(router.state.location.pathname).toBe(at);
    },
  );

  it('asks again on "Try again", showing it is busy meanwhile, and goes on once the server answers', async () => {
    const { session } = setup('/habits');
    const callsAfterMount = session.restoreCalls; // the provider's own restore on page load
    const release = session.holdRestore();

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(session.restoreCalls).toBe(callsAfterMount + 1);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDisabled();

    // The server is back: the session adopts the stored token, then the guard lets them in.
    act(() => session.set(signedIn));
    release();
    expect(await screen.findByText('habits')).toBeInTheDocument();
  });

  it('can be tried again after a failed attempt', async () => {
    const { session } = setup('/habits');
    const callsAfterMount = session.restoreCalls;

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(session.restoreCalls).toBe(callsAfterMount + 2);
  });

  it('tries by itself when the browser comes back online - and only then', () => {
    const { session } = setup('/habits');
    const callsAfterMount = session.restoreCalls;

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(session.restoreCalls).toBe(callsAfterMount + 1);

    // Signed in again: an "online" event has nothing to retry.
    act(() => session.set(signedIn));
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(session.restoreCalls).toBe(callsAfterMount + 1);
  });
});
