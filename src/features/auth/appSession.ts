import { API_BASE_URL, createHttpClient, createTypedApi, setClientAuth } from '@/shared/api';
import { crossTabExclusive } from '@/shared/lib/exclusive';
import { createRefreshTokenStore } from './refreshTokenStore';
import { createSession } from './session';
import { createSessionGateway } from './sessionGateway';

/**
 * The one session of this page, wired to the real browser storage and the real API. Importing
 * this module also plugs it into the API client, so every call carries the token.
 * (Everything with logic in it takes its parts as arguments and is tested without this file.)
 */
export const session = createSession({
  store: createRefreshTokenStore(),
  gateway: createSessionGateway(createTypedApi(createHttpClient({ baseURL: API_BASE_URL }))),
  // Tabs of one browser profile share the refresh token, so they have to share the lock.
  exclusive: crossTabExclusive('hh-refresh-token'),
});

setClientAuth(session);
