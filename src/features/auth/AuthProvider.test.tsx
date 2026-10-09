import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '@/shared/ui';
import { fakeSession, restoring, signedIn, signedOut, testUser } from '@/test/fakeSession';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './auth-context';

function Probe() {
  const { status, user, signOut } = useAuth();
  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="user">{user?.firstName ?? 'nobody'}</p>
      <button onClick={() => void signOut()}>Sign out</button>
    </div>
  );
}

function setup(initial = signedOut) {
  const session = fakeSession(initial);
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider session={session}>
          <Probe />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { session, queryClient };
}

describe('AuthProvider', () => {
  it('shows the state of the session and follows its changes', () => {
    const { session } = setup(restoring);
    expect(screen.getByTestId('status')).toHaveTextContent('restoring');
    expect(screen.getByTestId('user')).toHaveTextContent('nobody');

    act(() => session.set(signedIn));

    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('Hanna');
  });

  it('restores the stored session once on mount', () => {
    const { session } = setup(restoring);

    expect(session.restoreCalls).toBe(1);
  });

  it('hands sign-out to the session', async () => {
    const { session } = setup(signedIn);

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(session.endCalls).toBe(1);
  });

  describe('cached server data', () => {
    it('is thrown away when the person signs out', () => {
      const { session, queryClient } = setup(signedIn);
      queryClient.setQueryData(['habits'], [{ title: 'Read' }]);

      act(() => session.set(signedOut));

      expect(queryClient.getQueryData(['habits'])).toBeUndefined();
    });

    it('is thrown away when a different person signs in', () => {
      const { session, queryClient } = setup(signedIn);
      queryClient.setQueryData(['habits'], [{ title: 'Read' }]);

      act(() => session.set({ ...signedIn, user: { ...testUser, id: 'u-2', firstName: 'Anna' } }));

      expect(queryClient.getQueryData(['habits'])).toBeUndefined();
    });

    it('stays while the same person remains signed in', () => {
      const { session, queryClient } = setup(signedIn);
      queryClient.setQueryData(['habits'], [{ title: 'Read' }]);

      // A token refresh makes the session announce itself again with the same person.
      act(() => session.set({ ...signedIn }));

      expect(queryClient.getQueryData(['habits'])).toEqual([{ title: 'Read' }]);
    });
  });

  describe('when the server ended the session', () => {
    it('says so', () => {
      const { session } = setup(signedIn);

      act(() => session.set({ status: 'anonymous', user: null, endedBy: 'expired' }));

      expect(screen.getByRole('status')).toHaveTextContent(
        'Your session has expired. Please sign in again.',
      );
    });

    it('stays quiet after the person logged out themselves', () => {
      const { session } = setup(signedIn);

      act(() => session.set({ status: 'anonymous', user: null, endedBy: 'signed-out' }));

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });
});

describe('useAuth', () => {
  it('refuses to work without a provider', () => {
    // React reports the error it throws twice more (jsdom's error event, console.error); the
    // test expects it, so keep the output readable.
    const quiet = (event: ErrorEvent) => event.preventDefault();
    const originalError = console.error;
    window.addEventListener('error', quiet);
    console.error = () => undefined;
    try {
      expect(() => render(<Probe />)).toThrow('useAuth must be used inside an <AuthProvider>');
    } finally {
      console.error = originalError;
      window.removeEventListener('error', quiet);
    }
  });
});
