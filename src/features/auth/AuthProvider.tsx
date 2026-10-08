import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/ui';
import { AuthContext, type AuthApi } from './auth-context';
import type { Session } from './session';

interface AuthProviderProps {
  session: Session;
  children: ReactNode;
}

/**
 * Puts the session (plain TypeScript, see session.ts) into React: components re-render when it
 * changes, and two things happen that need React's hooks:
 *  - the cached server data is thrown away when the person changes or leaves, so the next
 *    person never sees it (the server filters by user, the browser cache must not undo that);
 *  - a session that the server ended says so in a toast, instead of the page just switching to
 *    the login screen.
 */
export function AuthProvider({ session, children }: AuthProviderProps) {
  const state = useSyncExternalStore(session.subscribe, session.getState);
  const queryClient = useQueryClient();
  const toast = useToast();

  // Once per page load (the session ignores a second call, e.g. from StrictMode).
  useEffect(() => {
    void session.restore();
  }, [session]);

  // The cleanup runs when the person changes or leaves: their data goes with them.
  const userId = state.user?.id ?? null;
  useEffect(() => {
    return () => queryClient.clear();
  }, [userId, queryClient]);

  useEffect(() => {
    if (state.endedBy === 'expired') toast.info('Your session has expired. Please sign in again.');
  }, [state.endedBy, toast]);

  const value = useMemo<AuthApi>(
    () => ({
      status: state.status,
      user: state.user,
      signIn: session.start,
      signOut: session.end,
    }),
    [state.status, state.user, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
