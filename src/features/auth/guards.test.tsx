import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '@/shared/ui';
import { fakeSession, restoring, signedIn, signedOut } from '@/test/fakeSession';
import { AuthProvider } from './AuthProvider';
import { PublicOnly, RequireAuth, type LoginLocationState } from './guards';

function LoginProbe() {
  const location = useLocation();
  const from = (location.state as LoginLocationState | null)?.from ?? 'none';
  return <p>login page (from: {from})</p>;
}

function setup(state: typeof signedOut, at: string) {
  const router = createMemoryRouter(
    [
      { element: <PublicOnly />, children: [{ path: '/login', element: <LoginProbe /> }] },
      {
        element: <RequireAuth />,
        children: [
          { path: '/', element: <p>today</p> },
          { path: '/habits', element: <p>habits</p> },
        ],
      },
    ],
    { initialEntries: [at] },
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <AuthProvider session={fakeSession(state)}>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
  return router;
}

describe('RequireAuth', () => {
  it('shows the page to a signed-in person', () => {
    setup(signedIn, '/habits');

    expect(screen.getByText('habits')).toBeInTheDocument();
  });

  it('sends anybody else to the login page and remembers where they wanted to go', () => {
    const router = setup(signedOut, '/habits?month=2026-10');

    expect(router.state.location.pathname).toBe('/login');
    expect(screen.getByText('login page (from: /habits?month=2026-10)')).toBeInTheDocument();
  });

  it('waits while the stored session is being restored: no flash of the login page', () => {
    const router = setup(restoring, '/habits');

    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    expect(router.state.location.pathname).toBe('/habits');
    expect(screen.queryByText('habits')).not.toBeInTheDocument();
  });
});

describe('PublicOnly', () => {
  it('shows the login page to somebody who is signed out', () => {
    setup(signedOut, '/login');

    expect(screen.getByText('login page (from: none)')).toBeInTheDocument();
  });

  it('sends a signed-in person away from the login page', () => {
    const router = setup(signedIn, '/login');

    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByText('today')).toBeInTheDocument();
  });

  it('waits while the stored session is being restored', () => {
    setup(restoring, '/login');

    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });
});
