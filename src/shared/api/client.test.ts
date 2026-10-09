import { describe, expect, it } from 'vitest';
import { fakeServer, type FakeReply, type RecordedRequest } from '@/test/fakeServer';
import { createHttpClient, type ClientAuth } from './client';
import { ApiError } from './problem';

const ok = (data: unknown = {}): FakeReply => ({ status: 200, data });
const unauthorized: FakeReply = { status: 401, data: { title: 'Unauthorized' } };

interface FakeAuth extends ClientAuth {
  token: string | null;
  renewals: string[];
}

/** Signed-in as far as the client can tell: it holds a token and counts renewals. */
function fakeAuth(initialToken: string | null, renewTo = 'fresh'): FakeAuth {
  const auth: FakeAuth = {
    token: initialToken,
    renewals: [],
    getAccessToken: () => auth.token,
    renew: (rejected) => {
      auth.renewals.push(rejected);
      auth.token = renewTo;
      return Promise.resolve(renewTo);
    },
  };
  return auth;
}

function clientFor(
  respond: (request: RecordedRequest) => FakeReply | Promise<FakeReply>,
  auth?: ClientAuth,
) {
  const server = fakeServer(respond);
  return {
    ...server,
    http: createHttpClient({ baseURL: 'http://api.test/api', auth, adapter: server.adapter }),
  };
}

describe('the token', () => {
  it('goes out with every request while somebody is signed in', async () => {
    const { http, requests } = clientFor(() => ok(), fakeAuth('t1'));

    await http.get('/habits');

    expect(requests[0]?.authorization).toBe('Bearer t1');
  });

  it('is left out when nobody is signed in', async () => {
    const { http, requests } = clientFor(() => ok(), fakeAuth(null));

    await http.get('/habits');

    expect(requests[0]?.authorization).toBeNull();
  });

  it('is left out by a client that has no auth at all (the login endpoints)', async () => {
    const { http, requests } = clientFor(() => ok());

    await http.post('/auth/login', { email: 'a@b.c', password: 'x' });

    expect(requests[0]?.authorization).toBeNull();
  });
});

describe('a 401 on an authenticated request', () => {
  it('renews the token and replays the request once, body included', async () => {
    const auth = fakeAuth('stale');
    const { http, requests } = clientFor(
      (request) => (request.authorization === 'Bearer fresh' ? ok({ id: 1 }) : unauthorized),
      auth,
    );

    const response = await http.post('/habits', { title: 'Read' });

    expect(response.data).toEqual({ id: 1 });
    expect(auth.renewals).toEqual(['stale']);
    expect(requests.map((r) => r.authorization)).toEqual(['Bearer stale', 'Bearer fresh']);
    expect(requests.map((r) => r.body)).toEqual([{ title: 'Read' }, { title: 'Read' }]);
  });

  it('gives up after one retry: a 401 with a fresh token is final, no renew loop', async () => {
    const auth = fakeAuth('stale');
    const { http, requests } = clientFor(() => unauthorized, auth);

    await expect(http.get('/habits')).rejects.toMatchObject({ status: 401 });

    expect(requests).toHaveLength(2);
    expect(auth.renewals).toHaveLength(1);
  });

  it('shows why the renewal failed (session over, or no network) instead of the 401', async () => {
    const sessionOver = new ApiError(401, {
      title: 'Unauthorized',
      detail: 'Invalid refresh token.',
      fieldErrors: {},
    });
    const auth: ClientAuth = {
      getAccessToken: () => 'stale',
      renew: () => Promise.reject(sessionOver),
    };
    const { http } = clientFor(() => unauthorized, auth);

    await expect(http.get('/habits')).rejects.toBe(sessionOver);
  });

  it('keeps the 401 when the renew code fails for a reason that is not an API answer', async () => {
    const auth: ClientAuth = {
      getAccessToken: () => 'stale',
      renew: () => Promise.reject(new Error('Not signed in')),
    };
    const { http } = clientFor(() => unauthorized, auth);

    await expect(http.get('/habits')).rejects.toMatchObject({ name: 'ApiError', status: 401 });
  });

  it('does not touch a 401 of a request that carried no token (wrong password)', async () => {
    const auth = fakeAuth(null);
    const { http, requests } = clientFor(
      () => ({ status: 401, data: { detail: 'Wrong email or password.' } }),
      auth,
    );

    await expect(http.post('/auth/login', {})).rejects.toMatchObject({
      status: 401,
      message: 'Wrong email or password.',
    });
    expect(auth.renewals).toEqual([]);
    expect(requests).toHaveLength(1);
  });

  it('does not touch a 401 on a client without auth', async () => {
    const { http, requests } = clientFor(() => unauthorized);

    await expect(http.post('/auth/refresh', {})).rejects.toMatchObject({ status: 401 });
    expect(requests).toHaveLength(1);
  });

  it('only a 401 triggers a renewal: a 403 or a 500 just fail', async () => {
    for (const status of [403, 404, 500]) {
      const auth = fakeAuth('t1');
      const { http } = clientFor(() => ({ status }), auth);

      await expect(http.get('/habits')).rejects.toMatchObject({ status });
      expect(auth.renewals).toEqual([]);
    }
  });
});

describe('errors', () => {
  it('leave as ApiError, with the field errors of a validation answer', async () => {
    const { http } = clientFor(() => ({
      status: 400,
      data: { title: 'Validation', errors: { title: ['Required.'] } },
    }));

    await expect(http.post('/habits', {})).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      fieldErrors: { title: ['Required.'] },
    });
  });

  it('are status 0 when the server cannot be reached', async () => {
    const { http } = clientFor(() => 'network-error', fakeAuth('t1'));

    await expect(http.get('/habits')).rejects.toMatchObject({
      name: 'ApiError',
      isNetworkError: true,
    });
  });
});
