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

/**
 * Only a path inside the app is a place to send somebody back to. `from` is written by
 * `RequireAuth`, so this is a second lock, not the first: a `//host`, `/\host` or `https://…` value
 * would leave the app.
 */
function returnPath(from: string | undefined): string {
  if (!from) return '/';
  const staysInApp = from.startsWith('/') && !from.startsWith('//') && !from.includes('\\');
  return staysInApp ? from : '/';
}

/**
 * Layout route for the login page. Somebody who is already signed in has no business there; they
 * go back to the page `RequireAuth` turned them away from (also right after they signed in on
 * the login page), or to the start page.
 */
export function PublicOnly() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'restoring') return <PageSpinner />;
  if (status === 'authenticated') {
    const state = location.state as LoginLocationState | null;
    return <Navigate to={returnPath(state?.from)} replace />;
  }
  return <Outlet />;
}
