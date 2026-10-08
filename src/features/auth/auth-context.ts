import { createContext, useContext } from 'react';
import type { AuthResult, SessionStatus, SessionUser } from './session';

export interface AuthApi {
  status: SessionStatus;
  /** `null` unless `status` is `authenticated`. */
  user: SessionUser | null;
  /** Call with the server's answer after a successful login, registration or Google sign-in. */
  signIn: (result: AuthResult) => void;
  signOut: () => Promise<void>;
  /** For `status === 'unreachable'`: ask the server again whether the stored session still holds. */
  reconnect: () => Promise<void>;
}

export const AuthContext = createContext<AuthApi | null>(null);

/** `const { status, user, signIn, signOut } = useAuth()` — needs an AuthProvider above. */
export function useAuth(): AuthApi {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside an <AuthProvider>');
  return auth;
}

/** The signed-in person, for screens behind `RequireAuth`. Throws if nobody is signed in. */
export function useUser(): SessionUser {
  const { user } = useAuth();
  if (!user) throw new Error('useUser must be used on a screen that requires a signed-in user');
  return user;
}
