import type { TypedApi } from '@/shared/api';
import type { SessionGateway } from './session';

/**
 * The two server calls behind the session, on a client that has no token logic of its own: a 401
 * from `refresh` means "this refresh token is not valid" and must not start another refresh.
 * (The calls that start a session are in `authGateway.ts`.)
 */
export function createSessionGateway(api: TypedApi): SessionGateway {
  return {
    refresh: (refreshToken) => api.post('/api/auth/refresh', { body: { refreshToken } }),

    // `revoke` is an authenticated call, so it gets the access token explicitly: the session may
    // have just dropped its own copy.
    revoke: (refreshToken, accessToken) =>
      api.post('/api/auth/revoke', {
        body: { refreshToken },
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
  };
}
