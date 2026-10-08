import { ApiError, type ClientAuth, type Schema } from '@/shared/api';
import { inPageExclusive, type Exclusive } from '@/shared/lib/exclusive';
import { singleFlight } from '@/shared/lib/singleFlight';

export type AuthResult = Schema<'AuthResult'>;
export type SessionUser = AuthResult['user'];

/**
 * `unreachable`: a session is stored but the server could not be asked whether it still holds
 * (no network, server down). Not the same as `anonymous`: the person is probably still signed in.
 */
export type SessionStatus = 'restoring' | 'authenticated' | 'anonymous' | 'unreachable';
/** `signed-out`: the person logged out. `expired`: the server no longer accepts the session. */
export type SessionEnd = 'signed-out' | 'expired';

export interface SessionState {
  readonly status: SessionStatus;
  readonly user: SessionUser | null;
  /** How the last session ended (so the UI can say "expired"); `null` before any / while signed in. */
  readonly endedBy: SessionEnd | null;
}

/** Where the refresh token lives between page loads. */
export interface RefreshTokenStore {
  read(): string | null;
  write(token: string): void;
  clear(): void;
  /**
   * Tells when *another tab* removed the token (it logged out): this tab has no session left
   * either. Returns the function that stops listening. A store that cannot hear other tabs (e.g.
   * memory only) leaves it out.
   */
  onRemovedElsewhere?(listener: () => void): () => void;
}

/** The two calls the session makes to the server; the HTTP details are not its business. */
export interface SessionGateway {
  /** Trades a refresh token for a new pair. A refresh token works exactly once. */
  refresh(refreshToken: string): Promise<AuthResult>;
  /** Invalidates the refresh token. The server requires a valid access token for this call. */
  revoke(refreshToken: string, accessToken: string): Promise<void>;
}

export interface SessionDeps {
  store: RefreshTokenStore;
  gateway: SessionGateway;
  /** One lock for everything that spends a refresh token. Across tabs in the app, see appSession. */
  exclusive?: Exclusive;
  now?: () => number;
}

export interface Session extends ClientAuth {
  getState: () => SessionState;
  /** For `useSyncExternalStore`. Returns the unsubscribe function. */
  subscribe: (listener: () => void) => () => void;
  /** Adopts the answer of a successful login / register / Google sign-in. */
  start: (result: AuthResult) => void;
  /**
   * On page load: if a refresh token is stored, trade it for a session. Safe to call twice.
   * Called again while the status is `unreachable`, it tries the server once more.
   */
  restore: () => Promise<void>;
  /** Logs out: the person is out at once, then the server is told (best effort). */
  end: () => Promise<void>;
}

/**
 * The server writes .NET timestamps with 7 fractional digits (`...37.3257235Z`). The ISO format
 * of the JavaScript spec has 3, and not every engine is lenient about more: cut them off.
 * An unreadable value gives NaN, which counts as "expired" (the safe side).
 */
export function parseServerTime(iso: string): number {
  return Date.parse(iso.replace(/(\.\d{3})\d+/, '$1'));
}

/** The access token is treated as expired a little early, so a request is not already doomed in flight. */
const EXPIRY_MARGIN_MS = 10_000;

/**
 * Who is signed in, and the tokens that prove it. No React in here: the HTTP client has to read
 * the token and renew it outside of any component, and a plain object is easy to test. React
 * looks at it through `AuthProvider`.
 *
 * The rules that keep sessions alive:
 *  - A refresh token works exactly once; using it twice (also in parallel) makes the server end
 *    every session of the person. So all refreshes go through one `singleFlight` (parallel 401s
 *    share one run) inside one `exclusive` lock (other tabs wait, then read the token the winner
 *    stored instead of reusing the old one).
 *  - Only an answer that rejects the token (400/401) ends the session. A missing network or a
 *    server error does not: the person stays signed in and the next request tries again.
 */
export function createSession({
  store,
  gateway,
  exclusive = inPageExclusive(),
  now = Date.now,
}: SessionDeps): Session {
  let state: SessionState = { status: 'restoring', user: null, endedBy: null };
  let accessToken: string | null = null;
  let accessTokenExpiresAt = 0;
  const listeners = new Set<() => void>();

  function setState(next: SessionState) {
    state = next;
    listeners.forEach((notify) => notify());
  }

  function adopt(result: AuthResult) {
    store.write(result.tokens.refreshToken);
    accessToken = result.tokens.accessToken;
    accessTokenExpiresAt = parseServerTime(result.tokens.accessTokenExpiresAt);
    setState({ status: 'authenticated', user: result.user, endedBy: null });
  }

  function drop(endedBy: SessionEnd | null) {
    store.clear();
    accessToken = null;
    accessTokenExpiresAt = 0;
    setState({ status: 'anonymous', user: null, endedBy });
  }

  /** The server stopped accepting the session. Not after a log-out: that has its own reason. */
  function expire() {
    if (state.status !== 'anonymous') drop('expired');
  }

  async function refreshNow(): Promise<string> {
    // Read inside the lock: a tab that held it before us has stored a newer token.
    const refreshToken = store.read();
    if (!refreshToken) {
      expire();
      throw new Error('There is no session to renew.');
    }

    let result: AuthResult;
    try {
      result = await gateway.refresh(refreshToken);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 400 || error.status === 401)) expire();
      throw error;
    }
    adopt(result);
    return result.tokens.accessToken;
  }

  const refresh = singleFlight(() => exclusive(refreshNow));

  // Another tab logged out: the shared token is gone, so is this tab's session. (Not "expired":
  // nothing went wrong, the person left on purpose.)
  store.onRemovedElsewhere?.(() => {
    if (state.status === 'authenticated' || state.status === 'unreachable') drop('signed-out');
  });

  let restoring: Promise<void> | null = null;

  return {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    start: adopt,

    restore() {
      // One run per page load - except after a failure that said nothing about the token.
      if (restoring && state.status !== 'unreachable') return restoring;

      restoring = (async () => {
        if (!store.read()) {
          setState({ status: 'anonymous', user: null, endedBy: null });
          return;
        }
        try {
          await refresh();
        } catch {
          // A rejected token already ended the session (and kept the reason). Any other failure
          // (no network, server down) says nothing about the token: it stays, and the person is
          // told the server cannot be reached instead of being shown a login form they do not
          // need. They (or the browser coming back online) can try again with `restore()`.
          if (state.status === 'restoring') {
            setState({ status: 'unreachable', user: null, endedBy: null });
          }
        }
      })();
      return restoring;
    },

    getAccessToken: () => accessToken,

    async renew(rejectedToken) {
      // Another request got here first and the token is already new: just use that one.
      if (accessToken && accessToken !== rejectedToken) return accessToken;
      return refresh();
    },

    end() {
      return exclusive(async () => {
        const refreshToken = store.read();
        const usableAccessToken =
          accessToken && now() < accessTokenExpiresAt - EXPIRY_MARGIN_MS ? accessToken : null;
        drop('signed-out'); // the person is out now, whatever the server says

        if (!refreshToken) return;
        try {
          // Revoking needs a valid access token. If this one has run out, trade the refresh token
          // for a new pair first; that also makes the token we revoke the current one.
          const credentials = usableAccessToken
            ? { refreshToken, accessToken: usableAccessToken }
            : (await gateway.refresh(refreshToken)).tokens;
          await gateway.revoke(credentials.refreshToken, credentials.accessToken);
        } catch {
          // Logging out works locally in any case. If the server could not be told, the refresh
          // token just stays valid until it expires.
        }
      });
    },
  };
}
