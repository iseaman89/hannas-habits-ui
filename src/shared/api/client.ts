import axios, { isAxiosError, type AxiosAdapter, type AxiosInstance } from 'axios';
import { ApiError, toApiError } from './problem';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Set on the one retry after the access token was renewed; a second 401 is final. */
    authRenewed?: boolean;
  }
}

/**
 * What the client needs from "whoever is signed in". The auth feature implements it and plugs
 * itself in at start-up: `shared` must not import a feature (dependency inversion), and the
 * client can be tested with a fake.
 */
export interface ClientAuth {
  /** The token for the `Authorization` header, or `null` when nobody is signed in. */
  getAccessToken: () => string | null;
  /**
   * The server answered 401 to a request that carried `rejectedToken`. Resolves with a token to
   * retry with, rejects when none can be had (the session is over). Implementations must make
   * parallel calls share one refresh: a refresh token works exactly once.
   */
  renew: (rejectedToken: string) => Promise<string>;
}

export interface HttpClientOptions {
  /** Base URL including the `/api` prefix. */
  baseURL: string;
  /** Without it the client sends no token and never retries: for the auth endpoints themselves. */
  auth?: ClientAuth;
  /** Milliseconds until a request without an answer fails as a network error. */
  timeout?: number;
  /** Replaces the transport (tests). */
  adapter?: AxiosAdapter;
}

const BEARER = /^Bearer (.+)$/;

/**
 * The one axios client. Requests carry the access token; a 401 on such a request renews the
 * token once and replays the request; every failure leaves as an `ApiError`.
 *
 * The auth endpoints (login, refresh, ...) use a client without `auth`: a 401 from `login` means
 * "wrong password" and must not start a token refresh.
 */
export function createHttpClient({
  baseURL,
  auth,
  timeout = 20_000,
  adapter,
}: HttpClientOptions): AxiosInstance {
  const client = axios.create({ baseURL, timeout, adapter });

  if (auth) {
    client.interceptors.request.use((config) => {
      const token = auth.getAccessToken();
      if (token) config.headers.set('Authorization', `Bearer ${token}`);
      return config;
    });
  }

  client.interceptors.response.use(undefined, async (error: unknown) => {
    if (auth && isAxiosError(error) && error.response?.status === 401 && error.config) {
      const { config } = error;
      const rejected = BEARER.exec(String(config.headers.get('Authorization') ?? ''))?.[1];

      if (rejected && !config.authRenewed) {
        let token: string;
        try {
          token = await auth.renew(rejected);
        } catch (renewError) {
          // The refresh itself failed: its reason (session over, or just no network) is the
          // more useful one. A plain bug in the renew code is not, then the 401 stays.
          const reason = toApiError(renewError);
          throw reason instanceof ApiError ? reason : toApiError(error);
        }
        config.headers.set('Authorization', `Bearer ${token}`);
        return client.request({ ...config, authRenewed: true });
      }
    }
    throw toApiError(error);
  });

  return client;
}
