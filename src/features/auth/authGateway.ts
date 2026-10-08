import type { TypedApi } from '@/shared/api';
import { authApi } from './authClient';
import type { AuthResult } from './session';

/**
 * The calls that start a session. Every one answers with the same `AuthResult`, which goes to
 * `useAuth().signIn`. (Renewing and ending a session are the session's own calls, see
 * `sessionGateway.ts`.)
 */
export interface AuthGateway {
  login: (credentials: { email: string; password: string }) => Promise<AuthResult>;
  /** `displayName` is optional: blank means "none", the server then uses the email's local part. */
  register: (account: {
    email: string;
    password: string;
    displayName: string;
  }) => Promise<AuthResult>;
  /** `idToken` is the credential Google's sign-in button hands over. */
  google: (idToken: string) => Promise<AuthResult>;
}

export function createAuthGateway(api: TypedApi): AuthGateway {
  return {
    login: ({ email, password }) => api.post('/api/auth/login', { body: { email, password } }),

    register: ({ email, password, displayName }) =>
      api.post('/api/auth/register', {
        body: { email, password, displayName: displayName || undefined },
      }),

    google: (idToken) => api.post('/api/auth/google', { body: { idToken } }),
  };
}

/** The gateway of the running app. */
export const authGateway = createAuthGateway(authApi);
