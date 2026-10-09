import { createHttpClient, type ClientAuth } from './client';
import { API_BASE_URL } from './config';
import { createTypedApi } from './typed';

export { API_BASE_URL } from './config';
export { createHttpClient } from './client';
export type { ClientAuth, HttpClientOptions } from './client';
export { ApiError, NO_RESPONSE, errorMessage } from './problem';
export { createTypedApi } from './typed';
export type { RequestOptions, Schema, TypedApi } from './typed';

let clientAuth: ClientAuth | null = null;

/**
 * Plugs in whoever knows the current token (the auth feature does this once at start-up). Until
 * then requests go out without a token.
 */
export function setClientAuth(auth: ClientAuth): void {
  clientAuth = auth;
}

/** The API client every feature uses. Authenticated; the auth endpoints use their own (see auth). */
export const api = createTypedApi(
  createHttpClient({
    baseURL: API_BASE_URL,
    auth: {
      getAccessToken: () => clientAuth?.getAccessToken() ?? null,
      renew: (rejectedToken) =>
        clientAuth ? clientAuth.renew(rejectedToken) : Promise.reject(new Error('Not signed in')),
    },
  }),
);
