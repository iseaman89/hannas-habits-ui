import { describe, expect, it } from 'vitest';
import { ApiError, createHttpClient, createTypedApi } from '@/shared/api';
import { fakeServer, type FakeReply } from '@/test/fakeServer';
import { createTagsGateway } from './tagsGateway';

function gatewayFor(respond: FakeReply) {
  const server = fakeServer(() => respond);
  const http = createHttpClient({ baseURL: 'http://api.test/api', adapter: server.adapter });
  return { gateway: createTagsGateway(createTypedApi(http)), requests: server.requests };
}

const tag = { id: 't-1', name: 'krank', useCount: 3, habitUseCount: 1, lastUsedOn: '2026-10-05' };

describe('tags gateway', () => {
  it('lists every tag without a habit', async () => {
    const { gateway, requests } = gatewayFor({ status: 200, data: [tag] });

    await expect(gateway.list()).resolves.toEqual([tag]);

    expect(requests[0]).toMatchObject({ method: 'get', url: '/tags' });
    expect(requests[0]?.params).toBeUndefined();
  });

  it('asks for the order of one habit', async () => {
    const { gateway, requests } = gatewayFor({ status: 200, data: [tag] });

    await gateway.list('h-1');

    expect(requests[0]).toMatchObject({ method: 'get', url: '/tags', params: { habitId: 'h-1' } });
  });

  it('creates a tag and returns what the server says, 201 or 200', async () => {
    for (const status of [201, 200]) {
      const { gateway, requests } = gatewayFor({ status, data: { id: 't-1', name: 'Krank' } });

      await expect(gateway.create('krank')).resolves.toEqual({ id: 't-1', name: 'Krank' });

      expect(requests[0]).toMatchObject({ method: 'post', url: '/tags', body: { name: 'krank' } });
    }
  });

  it('renames on the tag’s own address and returns the survivor', async () => {
    const answer = { id: 't-2', name: 'Urlaub', merged: true };
    const { gateway, requests } = gatewayFor({ status: 200, data: answer });

    await expect(gateway.rename('t-1', 'Urlaub')).resolves.toEqual(answer);

    expect(requests[0]).toMatchObject({
      method: 'put',
      url: '/tags/t-1',
      body: { name: 'Urlaub' },
    });
  });

  it('deletes a tag and returns on how many days it was', async () => {
    const { gateway, requests } = gatewayFor({ status: 200, data: { removedFromDays: 4 } });

    await expect(gateway.remove('t-1')).resolves.toEqual({ removedFromDays: 4 });

    expect(requests[0]).toMatchObject({ method: 'delete', url: '/tags/t-1' });
  });

  it('does not treat deleting a tag that is gone as a failure', async () => {
    const { gateway } = gatewayFor({ status: 404, data: { title: 'Not found' } });

    await expect(gateway.remove('t-1')).resolves.toEqual({ removedFromDays: 0 });
  });

  it('still reports every other failure', async () => {
    const { gateway } = gatewayFor({ status: 500 });

    await expect(gateway.remove('t-1')).rejects.toMatchObject({ status: 500 });
    await expect(gateway.list()).rejects.toBeInstanceOf(ApiError);
  });

  it('reports a 400 with its field', async () => {
    const { gateway } = gatewayFor({
      status: 400,
      data: { title: 'Invalid', errors: { name: ['The name is too long.'] } },
    });

    await expect(gateway.create('x'.repeat(40))).rejects.toMatchObject({
      status: 400,
      fieldErrors: { name: ['The name is too long.'] },
    });
  });
});
