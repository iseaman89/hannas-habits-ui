import { describe, expect, it } from 'vitest';
import { createHttpClient, createTypedApi } from '@/shared/api';
import { fakeServer, type FakeReply } from '@/test/fakeServer';
import { createAuthGateway } from './authGateway';

const authResult = {
  user: {
    id: 'u-1',
    userName: 'hanna@example.com',
    email: 'hanna@example.com',
    firstName: 'Hanna',
    lastName: null,
  },
  tokens: {
    accessToken: 'a1',
    refreshToken: 'r1',
    accessTokenExpiresAt: '2026-10-08T12:15:00Z',
    refreshTokenExpiresAt: '2026-11-07T12:00:00Z',
  },
};

function gatewayFor(reply: FakeReply) {
  const server = fakeServer(() => reply);
  // The same kind of client the app uses for these calls: no token logic of its own.
  const http = createHttpClient({ baseURL: 'http://api.test/api', adapter: server.adapter });
  return { gateway: createAuthGateway(createTypedApi(http)), requests: server.requests };
}

describe('auth gateway', () => {
  it('login posts the credentials and returns the auth result', async () => {
    const { gateway, requests } = gatewayFor({ status: 200, data: authResult });

    await expect(
      gateway.login({ email: 'hanna@example.com', password: 'Secret-123' }),
    ).resolves.toEqual(authResult);

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      method: 'post',
      url: '/auth/login',
      body: { email: 'hanna@example.com', password: 'Secret-123' },
      authorization: null,
    });
  });

  it('register posts the account including the name', async () => {
    const { gateway, requests } = gatewayFor({ status: 201, data: authResult });

    await expect(
      gateway.register({
        email: 'hanna@example.com',
        password: 'Secret-123',
        firstName: 'Hanna',
        lastName: 'Müller',
      }),
    ).resolves.toEqual(authResult);

    expect(requests[0]).toMatchObject({
      method: 'post',
      url: '/auth/register',
      body: {
        email: 'hanna@example.com',
        password: 'Secret-123',
        firstName: 'Hanna',
        lastName: 'Müller',
      },
    });
  });

  it('register leaves a name out when it is blank, so the server falls back by itself', async () => {
    const { gateway, requests } = gatewayFor({ status: 201, data: authResult });

    await gateway.register({
      email: 'hanna@example.com',
      password: 'Secret-123',
      firstName: '',
      lastName: '',
    });

    expect(requests[0]?.body).toEqual({ email: 'hanna@example.com', password: 'Secret-123' });
  });

  it('google posts the ID token under the name the server reads', async () => {
    const { gateway, requests } = gatewayFor({ status: 200, data: authResult });

    await expect(gateway.google('header.payload.signature')).resolves.toEqual(authResult);

    expect(requests[0]).toMatchObject({
      method: 'post',
      url: '/auth/google',
      body: { idToken: 'header.payload.signature' },
    });
  });

  it('does not try to renew anything on a 401: that answer means "wrong password"', async () => {
    const { gateway, requests } = gatewayFor({
      status: 401,
      data: { title: 'Authentication failed.', detail: 'The email or password is incorrect.' },
    });

    await expect(gateway.login({ email: 'a@b.c', password: 'nope' })).rejects.toMatchObject({
      status: 401,
      message: 'The email or password is incorrect.',
    });

    expect(requests).toHaveLength(1);
  });
});
