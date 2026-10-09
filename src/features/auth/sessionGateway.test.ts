import { describe, expect, it } from 'vitest';
import { createHttpClient, createTypedApi } from '@/shared/api';
import { fakeServer, type FakeReply } from '@/test/fakeServer';
import { createSessionGateway } from './sessionGateway';

const authResult = {
  user: { id: 'u-1', userName: 'a@b.c', email: 'a@b.c', firstName: 'A', lastName: null },
  tokens: {
    accessToken: 'a2',
    refreshToken: 'r2',
    accessTokenExpiresAt: '2026-10-08T12:15:00Z',
    refreshTokenExpiresAt: '2026-11-07T12:00:00Z',
  },
};

function gatewayFor(reply: FakeReply) {
  const server = fakeServer(() => reply);
  // The same kind of client the app uses for these calls: no token logic of its own.
  const http = createHttpClient({ baseURL: 'http://api.test/api', adapter: server.adapter });
  return { gateway: createSessionGateway(createTypedApi(http)), requests: server.requests };
}

describe('session gateway', () => {
  it('refresh posts the refresh token and returns the auth result', async () => {
    const { gateway, requests } = gatewayFor({ status: 200, data: authResult });

    await expect(gateway.refresh('r1')).resolves.toEqual(authResult);

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      method: 'post',
      url: '/auth/refresh',
      body: { refreshToken: 'r1' },
      authorization: null,
    });
  });

  it('refresh does not retry on a 401: that answer means the token is not valid', async () => {
    const { gateway, requests } = gatewayFor({ status: 401, data: { title: 'Unauthorized' } });

    await expect(gateway.refresh('r1')).rejects.toMatchObject({ status: 401 });

    expect(requests).toHaveLength(1);
  });

  it('revoke sends the refresh token and uses the access token it is given', async () => {
    const { gateway, requests } = gatewayFor({ status: 204 });

    await expect(gateway.revoke('r1', 'a1')).resolves.toBeUndefined();

    expect(requests[0]).toMatchObject({
      method: 'post',
      url: '/auth/revoke',
      body: { refreshToken: 'r1' },
      authorization: 'Bearer a1',
    });
  });
});
