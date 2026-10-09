import { describe, expect, it } from 'vitest';
import { ApiError, createHttpClient, createTypedApi } from '@/shared/api';
import { fakeServer, type FakeReply } from '@/test/fakeServer';
import { createResolutionsGateway } from './resolutionsGateway';

function gatewayFor(respond: FakeReply) {
  const server = fakeServer(() => respond);
  const http = createHttpClient({ baseURL: 'http://api.test/api', adapter: server.adapter });
  return { gateway: createResolutionsGateway(createTypedApi(http)), requests: server.requests };
}

const item = {
  id: 'r-1',
  title: 'Read more',
  kept: false,
  habitId: 'h-1',
  habitTitle: 'Read',
};

describe('resolutions gateway', () => {
  it('lists a year on the year’s own address', async () => {
    const { gateway, requests } = gatewayFor({ status: 200, data: [item] });

    await expect(gateway.list(2026)).resolves.toEqual([item]);

    expect(requests[0]).toMatchObject({ method: 'get', url: '/resolutions/2026' });
  });

  it('adds an item to the year and returns what the server made', async () => {
    const { gateway, requests } = gatewayFor({ status: 201, data: item });

    await expect(gateway.add(2026, { title: 'Read more', habitId: 'h-1' })).resolves.toEqual(item);

    expect(requests[0]).toMatchObject({
      method: 'post',
      url: '/resolutions/2026/items',
      body: { title: 'Read more', habitId: 'h-1' },
    });
  });

  it('sends “no habit” as an explicit null', async () => {
    const { gateway, requests } = gatewayFor({ status: 201, data: item });

    await gateway.add(2026, { title: 'Read more', habitId: null });

    expect(requests[0]?.body).toEqual({ title: 'Read more', habitId: null });
  });

  it('replaces the whole item, kept flag included', async () => {
    const { gateway, requests } = gatewayFor({ status: 204 });

    await expect(
      gateway.update(2026, 'r-1', { title: 'Read more', habitId: null, kept: true }),
    ).resolves.toBeUndefined();

    expect(requests[0]).toMatchObject({
      method: 'put',
      url: '/resolutions/2026/items/r-1',
      body: { title: 'Read more', habitId: null, kept: true },
    });
  });

  it('removes an item', async () => {
    const { gateway, requests } = gatewayFor({ status: 204 });

    await gateway.remove(2026, 'r-1');

    expect(requests[0]).toMatchObject({ method: 'delete', url: '/resolutions/2026/items/r-1' });
  });

  it('does not treat removing an item that is gone already as a failure', async () => {
    const { gateway } = gatewayFor({ status: 404, data: { title: 'Not found' } });

    await expect(gateway.remove(2026, 'r-1')).resolves.toBeUndefined();
  });

  it('still reports every other failure of remove', async () => {
    const { gateway } = gatewayFor({ status: 500 });

    await expect(gateway.remove(2026, 'r-1')).rejects.toMatchObject({ status: 500 });
  });

  it('reports a 404 of update: the item the person edited is gone', async () => {
    const { gateway } = gatewayFor({ status: 404, data: { title: 'Not found' } });

    await expect(
      gateway.update(2026, 'r-1', { title: 'x', habitId: null, kept: false }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('hands the server’s field complaints on', async () => {
    const { gateway } = gatewayFor({
      status: 400,
      data: { title: 'Invalid', errors: { habitId: ['The habit does not exist.'] } },
    });

    await expect(gateway.add(2026, { title: 'x', habitId: 'nope' })).rejects.toMatchObject({
      status: 400,
      fieldErrors: { habitId: ['The habit does not exist.'] },
    });
  });
});
