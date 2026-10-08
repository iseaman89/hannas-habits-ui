import { describe, expect, it } from 'vitest';
import { ApiError, createHttpClient, createTypedApi } from '@/shared/api';
import { fakeServer, type FakeReply } from '@/test/fakeServer';
import { createHabitsGateway } from './habitsGateway';

function gatewayFor(respond: FakeReply | (() => FakeReply)) {
  const server = fakeServer(() => (typeof respond === 'function' ? respond() : respond));
  const http = createHttpClient({ baseURL: 'http://api.test/api', adapter: server.adapter });
  return { gateway: createHabitsGateway(createTypedApi(http)), requests: server.requests };
}

const overview = [
  {
    id: 'h-1',
    title: 'Stretch',
    schedule: [1, 3, 5],
    startDate: '2026-10-01',
    completedDates: ['2026-10-05'],
    currentStreak: 1,
  },
];

describe('habits gateway', () => {
  it('asks for the overview of a range with the client’s today', async () => {
    const { gateway, requests } = gatewayFor({ status: 200, data: overview });

    await expect(
      gateway.overview({ from: '2026-10-01', to: '2026-10-31', asOf: '2026-10-07' }),
    ).resolves.toEqual(overview);

    expect(requests[0]).toMatchObject({
      method: 'get',
      url: '/habits/overview',
      params: { from: '2026-10-01', to: '2026-10-31', asOf: '2026-10-07' },
    });
  });

  it('reads one habit by id', async () => {
    const habit = { id: 'h 1', title: 'Stretch', description: null };
    const { gateway, requests } = gatewayFor({ status: 200, data: habit });

    await expect(gateway.details('h 1')).resolves.toEqual(habit);

    // The id is part of the path, so it is encoded.
    expect(requests[0]).toMatchObject({ method: 'get', url: '/habits/h%201' });
  });

  it('creates a habit with its start date and returns what the server made', async () => {
    const created = { id: 'h-2', title: 'Read', schedule: [1], startDate: '2026-10-07' };
    const { gateway, requests } = gatewayFor({ status: 201, data: created });
    const input = {
      title: 'Read',
      description: null,
      schedule: [1 as const],
      startDate: '2026-10-07',
    };

    await expect(gateway.create(input)).resolves.toEqual(created);

    expect(requests[0]).toMatchObject({ method: 'post', url: '/habits', body: input });
  });

  it('updates the whole habit and sends no start date', async () => {
    const { gateway, requests } = gatewayFor({ status: 204 });

    await gateway.update('h-1', { title: 'Stretch', description: 'Morning', schedule: [2, 4] });

    expect(requests[0]).toMatchObject({
      method: 'put',
      url: '/habits/h-1',
      body: { title: 'Stretch', description: 'Morning', schedule: [2, 4] },
    });
    expect(requests[0]?.body).not.toHaveProperty('startDate');
  });

  it('deletes a habit', async () => {
    const { gateway, requests } = gatewayFor({ status: 204 });

    await gateway.remove('h-1');

    expect(requests[0]).toMatchObject({ method: 'delete', url: '/habits/h-1' });
  });

  it('marks a day with PUT on the day’s own address', async () => {
    const { gateway, requests } = gatewayFor({
      status: 200,
      data: { id: 'r-1', habitId: 'h-1', date: '2026-10-07' },
    });

    await expect(gateway.mark('h-1', '2026-10-07')).resolves.toBeUndefined();

    expect(requests[0]).toMatchObject({ method: 'put', url: '/habits/h-1/records/2026-10-07' });
  });

  it('takes a mark back with DELETE', async () => {
    const { gateway, requests } = gatewayFor({ status: 204 });

    await gateway.unmark('h-1', '2026-10-07');

    expect(requests[0]).toMatchObject({ method: 'delete', url: '/habits/h-1/records/2026-10-07' });
  });

  it('does not treat taking back a day that is not marked as a failure', async () => {
    const { gateway } = gatewayFor({ status: 404, data: { title: 'Not found' } });

    await expect(gateway.unmark('h-1', '2026-10-07')).resolves.toBeUndefined();
  });

  it('still reports every other failure of unmark', async () => {
    const { gateway } = gatewayFor({ status: 500 });

    await expect(gateway.unmark('h-1', '2026-10-07')).rejects.toMatchObject({ status: 500 });
  });

  it('reports a 404 of any other call', async () => {
    const { gateway } = gatewayFor({ status: 404, data: { title: 'Not found' } });

    await expect(gateway.details('h-1')).rejects.toBeInstanceOf(ApiError);
    await expect(gateway.mark('h-1', '2026-10-07')).rejects.toMatchObject({ status: 404 });
  });
});
