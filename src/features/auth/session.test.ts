import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/api';
import { inPageExclusive } from '@/shared/lib/exclusive';
import {
  createSession,
  parseServerTime,
  type AuthResult,
  type RefreshTokenStore,
  type Session,
  type SessionGateway,
} from './session';

const START = Date.parse('2026-10-08T12:00:00Z');
const ACCESS_LIFETIME_MS = 15 * 60_000;

const user = {
  id: '6c6bba06-0000-4000-8000-000000000001',
  userName: 'hanna@example.com',
  email: 'hanna@example.com',
  displayName: 'Hanna',
};

const rejected = (status: number) =>
  new ApiError(status, { title: 'Unauthorized', detail: null, fieldErrors: {} });
const noNetwork = () => new ApiError(0, { title: null, detail: null, fieldErrors: {} });

/** A clock the test moves by hand. */
function clock() {
  let time = START;
  return { now: () => time, advance: (ms: number) => (time += ms) };
}

function memoryStore(initial: string | null = null) {
  let token = initial;
  const removedElsewhere = new Set<() => void>();
  return {
    read: () => token,
    write: (value: string) => (token = value),
    clear: () => (token = null),
    onRemovedElsewhere(listener: () => void) {
      removedElsewhere.add(listener);
      return () => removedElsewhere.delete(listener);
    },
    /** Another tab logged out: the shared token is gone and this tab is told. */
    removeInAnotherTab() {
      token = null;
      removedElsewhere.forEach((notify) => notify());
    },
  } satisfies RefreshTokenStore & { removeInAnotherTab: () => void };
}

/**
 * The server's rules for refresh tokens, as the backend implements them: each token works once,
 * and presenting a used one means theft (`compromised`). Calls are recorded.
 */
function fakeServer(now: () => number) {
  let issued = 0;
  const valid = new Set<string>();
  const used = new Set<string>();
  let hold: Promise<void> | null = null;
  let failure: ApiError | null = null;

  const server = {
    refreshCalls: [] as string[],
    revokeCalls: [] as Array<{ refreshToken: string; accessToken: string }>,
    compromised: false,

    /** A freshly issued pair, as login would answer. */
    issue(): AuthResult {
      issued++;
      valid.add(`r${issued}`);
      return {
        user,
        tokens: {
          accessToken: `a${issued}`,
          refreshToken: `r${issued}`,
          accessTokenExpiresAt: new Date(now() + ACCESS_LIFETIME_MS).toISOString(),
          refreshTokenExpiresAt: new Date(now() + 30 * 24 * 3_600_000).toISOString(),
        },
      };
    },
    /** Makes refresh answer only after `release()`. */
    holdRefreshes() {
      let release!: () => void;
      hold = new Promise<void>((resolve) => (release = resolve));
      return release;
    },
    failRefreshWith(error: ApiError | null) {
      failure = error;
    },

    gateway: {
      async refresh(refreshToken: string): Promise<AuthResult> {
        server.refreshCalls.push(refreshToken);
        await (hold ?? Promise.resolve());
        if (failure) throw failure;
        if (used.has(refreshToken)) {
          server.compromised = true;
          throw rejected(401);
        }
        if (!valid.delete(refreshToken)) throw rejected(401);
        used.add(refreshToken);
        return server.issue();
      },
      revoke(refreshToken: string, accessToken: string): Promise<void> {
        server.revokeCalls.push({ refreshToken, accessToken });
        valid.delete(refreshToken);
        return Promise.resolve();
      },
    } satisfies SessionGateway,
  };
  return server;
}

function setup(options: { stored?: string | null; startSignedIn?: boolean } = {}) {
  const time = clock();
  const server = fakeServer(time.now);
  const first = options.startSignedIn ? server.issue() : null;
  const store = memoryStore(options.stored ?? first?.tokens.refreshToken ?? null);
  const session = createSession({ store, gateway: server.gateway, now: time.now });
  if (first) session.start(first);
  return { session, server, store, time };
}

describe('start', () => {
  it('signs the person in and remembers the refresh token, not the access token', () => {
    const { session, store } = setup();
    const login = fakeServer(() => START).issue();

    session.start(login);

    expect(session.getState()).toEqual({ status: 'authenticated', user, endedBy: null });
    expect(session.getAccessToken()).toBe('a1');
    expect(store.read()).toBe('r1');
  });
});

describe('restore (page load)', () => {
  it('is anonymous without a stored token, and asks nobody', async () => {
    const { session, server } = setup();

    await session.restore();

    expect(session.getState()).toEqual({ status: 'anonymous', user: null, endedBy: null });
    expect(server.refreshCalls).toEqual([]);
  });

  it('trades a stored token for a session, and keeps the rotated token', async () => {
    const { session, server, store } = setup();
    store.write(server.issue().tokens.refreshToken);

    await session.restore();

    expect(session.getState()).toMatchObject({ status: 'authenticated', user });
    expect(session.getAccessToken()).toBe('a2');
    expect(store.read()).toBe('r2');
  });

  it('is "restoring" until the server answered', async () => {
    const { session, server, store } = setup();
    store.write(server.issue().tokens.refreshToken);
    const release = server.holdRefreshes();

    const restoring = session.restore();
    expect(session.getState().status).toBe('restoring');

    release();
    await restoring;
    expect(session.getState().status).toBe('authenticated');
  });

  it('refreshes once even when called twice (React StrictMode runs effects twice)', async () => {
    const { session, server, store } = setup();
    store.write(server.issue().tokens.refreshToken);

    await Promise.all([session.restore(), session.restore()]);
    await session.restore();

    expect(server.refreshCalls).toEqual(['r1']);
    expect(server.compromised).toBe(false);
  });

  it('ends as "expired" and forgets the token when the server rejects it', async () => {
    const { session, server, store } = setup({ stored: 'long-gone' });
    server.failRefreshWith(rejected(401));

    await session.restore();

    expect(session.getState()).toEqual({ status: 'anonymous', user: null, endedBy: 'expired' });
    expect(store.read()).toBeNull();
  });

  it('is "unreachable", not signed out, when the server cannot be reached - and keeps the token', async () => {
    const { session, server, store } = setup({ stored: 'r-kept' });
    server.failRefreshWith(noNetwork());

    await session.restore();

    expect(session.getState()).toEqual({ status: 'unreachable', user: null, endedBy: null });
    expect(store.read()).toBe('r-kept');
  });

  it('is "unreachable" for a server that answers with an error, too', async () => {
    const { session, server } = setup({ stored: 'r-kept' });
    server.failRefreshWith(new ApiError(503, { title: null, detail: null, fieldErrors: {} }));

    await session.restore();

    expect(session.getState().status).toBe('unreachable');
  });
});

describe('restore again after "unreachable"', () => {
  async function unreachableSession() {
    const setupResult = setup();
    const { session, server, store } = setupResult;
    store.write(server.issue().tokens.refreshToken);
    server.failRefreshWith(noNetwork());
    await session.restore();
    expect(session.getState().status).toBe('unreachable');
    return setupResult;
  }

  it('signs the person in once the server answers', async () => {
    const { session, server } = await unreachableSession();
    server.failRefreshWith(null);

    await session.restore();

    expect(session.getState()).toMatchObject({ status: 'authenticated', user });
  });

  it('stays "unreachable" while the server is still away, and does not tell anyone twice', async () => {
    const { session } = await unreachableSession();
    let notified = 0;
    session.subscribe(() => notified++);

    await session.restore();
    await session.restore();

    expect(session.getState().status).toBe('unreachable');
    expect(notified).toBe(0);
  });

  it('ends the session as "expired" when the server now says the token is no good', async () => {
    const { session, server, store } = await unreachableSession();
    server.failRefreshWith(rejected(401));

    await session.restore();

    expect(session.getState()).toEqual({ status: 'anonymous', user: null, endedBy: 'expired' });
    expect(store.read()).toBeNull();
  });

  it('is anonymous when the token has gone meanwhile (the person logged out in another tab)', async () => {
    const { session, store } = await unreachableSession();
    store.clear();

    await session.restore();

    expect(session.getState()).toEqual({ status: 'anonymous', user: null, endedBy: null });
  });

  it('does not run twice at once: a second call joins the one under way', async () => {
    const { session, server } = await unreachableSession();
    server.failRefreshWith(null);
    const callsBefore = server.refreshCalls.length;
    const release = server.holdRefreshes();

    const first = session.restore();
    const second = session.restore();
    release();
    await Promise.all([first, second]);

    expect(server.refreshCalls.length - callsBefore).toBe(1);
    expect(session.getState().status).toBe('authenticated');
  });
});

describe('a log-out in another tab', () => {
  it('ends this tab too, quietly: it is a log-out, not an expiry', () => {
    const { session, store } = setup({ startSignedIn: true });

    store.removeInAnotherTab();

    expect(session.getState()).toEqual({ status: 'anonymous', user: null, endedBy: 'signed-out' });
    expect(session.getAccessToken()).toBeNull();
  });

  it('ends a tab that was waiting for the server as well', async () => {
    const { session, server, store } = setup({ stored: 'r-kept' });
    server.failRefreshWith(noNetwork());
    await session.restore();

    store.removeInAnotherTab();

    expect(session.getState()).toEqual({ status: 'anonymous', user: null, endedBy: 'signed-out' });
  });

  it('changes nothing for a tab that is signed out already', async () => {
    const { session, store } = setup();
    await session.restore();
    let notified = 0;
    session.subscribe(() => notified++);

    store.removeInAnotherTab();

    expect(session.getState()).toEqual({ status: 'anonymous', user: null, endedBy: null });
    expect(notified).toBe(0);
  });
});

describe('renew (a request got a 401)', () => {
  it('refreshes and hands out the new access token', async () => {
    const { session, server, store } = setup({ startSignedIn: true });

    const token = await session.renew('a1');

    expect(token).toBe('a2');
    expect(session.getAccessToken()).toBe('a2');
    expect(server.refreshCalls).toEqual(['r1']);
    expect(store.read()).toBe('r2');
  });

  it('lets parallel 401s share one refresh: the token is used exactly once', async () => {
    const { session, server } = setup({ startSignedIn: true });
    const release = server.holdRefreshes();

    const renewals = [1, 2, 3, 4, 5].map(() => session.renew('a1'));
    release();

    expect(await Promise.all(renewals)).toEqual(['a2', 'a2', 'a2', 'a2', 'a2']);
    expect(server.refreshCalls).toEqual(['r1']);
    expect(server.compromised).toBe(false);
  });

  it('does not refresh again for a request that was rejected before the last refresh', async () => {
    const { session, server } = setup({ startSignedIn: true });
    await session.renew('a1'); // a request with a1 failed, the session now holds a2

    // A slower request that also still carried a1 now reports its 401.
    const token = await session.renew('a1');

    expect(token).toBe('a2');
    expect(server.refreshCalls).toEqual(['r1']);
  });

  it('uses the newest refresh token each time it refreshes', async () => {
    const { session, server } = setup({ startSignedIn: true });

    await session.renew('a1');
    await session.renew('a2');

    expect(server.refreshCalls).toEqual(['r1', 'r2']);
    expect(server.compromised).toBe(false);
  });

  it('ends the session when the server rejects the refresh token', async () => {
    const { session, server, store } = setup({ startSignedIn: true });
    server.failRefreshWith(rejected(401));

    await expect(session.renew('a1')).rejects.toMatchObject({ status: 401 });

    expect(session.getState()).toEqual({ status: 'anonymous', user: null, endedBy: 'expired' });
    expect(session.getAccessToken()).toBeNull();
    expect(store.read()).toBeNull();
  });

  it('keeps the person signed in when the refresh fails for lack of network', async () => {
    const { session, server, store } = setup({ startSignedIn: true });
    server.failRefreshWith(noNetwork());

    await expect(session.renew('a1')).rejects.toMatchObject({ isNetworkError: true });

    expect(session.getState().status).toBe('authenticated');
    expect(store.read()).toBe('r1');

    // The network is back: the next 401 refreshes after all.
    server.failRefreshWith(null);
    expect(await session.renew('a1')).toBe('a2');
  });

  it('ends the session as "expired" when another tab logged out and removed the token', async () => {
    const { session, store } = setup({ startSignedIn: true });
    store.clear(); // what the other tab did

    await expect(session.renew('a1')).rejects.toThrow('no session');

    expect(session.getState().endedBy).toBe('expired');
  });

  it('does not bring a logged-out session back to life', async () => {
    const { session } = setup({ startSignedIn: true });
    await session.end();

    // A request that was still in flight at log-out reports its 401 afterwards.
    await expect(session.renew('a1')).rejects.toThrow();

    expect(session.getState()).toEqual({ status: 'anonymous', user: null, endedBy: 'signed-out' });
  });
});

describe('two tabs', () => {
  function twoTabs(sharedLock: boolean) {
    const time = clock();
    const server = fakeServer(time.now);
    const login = server.issue();
    const store = memoryStore(login.tokens.refreshToken); // localStorage is shared
    const lock = inPageExclusive();
    const open = (): Session => {
      const session = createSession({
        store,
        gateway: server.gateway,
        exclusive: sharedLock ? lock : inPageExclusive(),
        now: time.now,
      });
      session.start(login); // both tabs hold the same pair in memory
      return session;
    };
    return { server, tabA: open(), tabB: open() };
  }

  it('never spend the same refresh token twice when both refresh at the same moment', async () => {
    const { server, tabA, tabB } = twoTabs(true);

    await Promise.all([tabA.renew('a1'), tabB.renew('a1')]);

    expect(server.compromised).toBe(false);
    expect(server.refreshCalls).toEqual(['r1', 'r2']); // the second tab used the first one's token
    expect(tabA.getState().status).toBe('authenticated');
    expect(tabB.getState().status).toBe('authenticated');
  });

  it('would burn the token without the shared lock (why the lock exists)', async () => {
    const { server, tabA, tabB } = twoTabs(false);

    const results = await Promise.allSettled([tabA.renew('a1'), tabB.renew('a1')]);

    expect(server.compromised).toBe(true);
    expect(results.map((r) => r.status)).toContain('rejected');
  });
});

describe('end (log out)', () => {
  it('signs out at once, forgets the token and revokes it on the server', async () => {
    const { session, server, store } = setup({ startSignedIn: true });

    await session.end();

    expect(session.getState()).toEqual({ status: 'anonymous', user: null, endedBy: 'signed-out' });
    expect(session.getAccessToken()).toBeNull();
    expect(store.read()).toBeNull();
    expect(server.revokeCalls).toEqual([{ refreshToken: 'r1', accessToken: 'a1' }]);
  });

  it('trades the tokens first when the access token has run out, and revokes the new refresh token', async () => {
    const { session, server, time } = setup({ startSignedIn: true });
    time.advance(ACCESS_LIFETIME_MS + 1_000);

    await session.end();

    expect(server.refreshCalls).toEqual(['r1']);
    // Revoking r1 would leave r2 (the one just issued) alive; r2 is the one to revoke.
    expect(server.revokeCalls).toEqual([{ refreshToken: 'r2', accessToken: 'a2' }]);
  });

  it('is signed out even when the server cannot be told', async () => {
    const { session, server } = setup({ startSignedIn: true });
    server.gateway.revoke = () => Promise.reject(noNetwork());

    await expect(session.end()).resolves.toBeUndefined();

    expect(session.getState().status).toBe('anonymous');
  });

  it('waits for a refresh that is under way and then revokes the token that refresh issued', async () => {
    const { session, server, store } = setup({ startSignedIn: true });
    const release = server.holdRefreshes();

    const renewing = session.renew('a1');
    const ending = session.end();
    release();
    await Promise.all([renewing, ending]);

    expect(session.getState().status).toBe('anonymous');
    expect(store.read()).toBeNull();
    expect(server.revokeCalls).toEqual([{ refreshToken: 'r2', accessToken: 'a2' }]);
  });

  it('does not ask the server when there was no refresh token', async () => {
    const { session, server } = setup();
    await session.restore();

    await session.end();

    expect(server.refreshCalls).toEqual([]);
    expect(server.revokeCalls).toEqual([]);
  });
});

describe('subscribe', () => {
  it('tells listeners about every change until they unsubscribe', () => {
    const { session, server } = setup();
    const seen: string[] = [];
    const unsubscribe = session.subscribe(() => seen.push(session.getState().status));

    session.start(server.issue());
    unsubscribe();
    void session.end();

    expect(seen).toEqual(['authenticated']);
  });

  it('hands out the same state object until something changes (useSyncExternalStore needs that)', () => {
    const { session } = setup({ startSignedIn: true });

    expect(session.getState()).toBe(session.getState());
  });
});

describe('parseServerTime', () => {
  it('reads the 7-digit timestamps the server writes', () => {
    expect(parseServerTime('2026-10-08T13:23:37.3257235Z')).toBe(
      Date.parse('2026-10-08T13:23:37.325Z'),
    );
  });

  it('reads timestamps with fewer or no fractional digits', () => {
    expect(parseServerTime('2026-10-08T13:23:37Z')).toBe(Date.parse('2026-10-08T13:23:37Z'));
    expect(parseServerTime('2026-10-08T13:23:37.5Z')).toBe(Date.parse('2026-10-08T13:23:37.5Z'));
  });

  it('gives NaN for anything else, which the session treats as expired', () => {
    expect(parseServerTime('soon')).toBeNaN();
  });
});
