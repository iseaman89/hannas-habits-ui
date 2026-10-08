import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from '@/shared/ui';
import { useAuth } from './auth-context';

function PageSpinner() {
  return (
    <div className="grid min-h-dvh place-items-center text-3xl text-accent">
      <Spinner label="Loading…" />
    </div>
  );
}

/** Where the login page should return to after signing in (`location.state.from`). */
export interface LoginLocationState {
  from?: string;
}

/**
 * Layout route for everything behind the login: shows the nested routes to a signed-in person,
 * sends everybody else to `/login` (remembering where they wanted to go). While the stored
 * session is still being restored on page load it shows a spinner, not the login form.
 */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'restoring') return <PageSpinner />;
  if (status === 'anonymous') {
    const state: LoginLocationState = { from: location.pathname + location.search };
    return <Navigate to="/login" replace state={state} />;
  }
  return <Outlet />;
}

/** Layout route for the login page: somebody who is already signed in has no business there. */
export function PublicOnly() {
  const { status } = useAuth();

  if (status === 'restoring') return <PageSpinner />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return <Outlet />;
}
