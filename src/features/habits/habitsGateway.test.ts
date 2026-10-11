import { describe, expect, it } from 'vitest';
import { ApiError, createHttpClient, createTypedApi } from '@/shared/api';
import { fakeServer, type FakeReply } from '@/test/fakeServer';
import { createHabitsGateway } from './habitsGateway';

function gatewayFor(respond: FakeReply | (() => FakeReply)) {
  const server = fakeServer(() => (typeof respond === 'function' ? respond() : respond));
  const http = createHttpClient({ baseURL: 'http://api.test/api', adapter: server.adapter });
  return { gateway: createHabitsGateway(createTypedApi(http)), requests: server.requests };
}

const weekly = (weekdays: number[]) => ({
  kind: 'weekly',
  weekdays,
  interval: 1,
  anchor: null,
  occurrence: null,
  weekday: null,
  dayOfMonth: null,
});

const overview = [
  {
    id: 'h-1',
    title: 'Stretch',
    recurrence: weekly([1, 3, 5]),
    startDate: '2026-10-01',
    scheduledDates: ['2026-10-02', '2026-10-05', '2026-10-07'],
    completedDates: ['2026-10-05'],
    currentStreak: 1,
  },
];

describe('habits gateway', () => {
  it('lists the habits without a range', async () => {
    const habits = [{ id: 'h-1', title: 'Stretch', description: null, recurrence: weekly([1, 3]) }];
    const { gateway, requests } = gatewayFor({ status: 200, data: habits });

    await expect(gateway.list()).resolves.toEqual(habits);

    expect(requests[0]).toMatchObject({ method: 'get', url: '/habits' });
    expect(requests[0]?.params).toBeUndefined();
  });

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
    const created = { id: 'h-2', title: 'Read', recurrence: weekly([1]), startDate: '2026-10-07' };
    const { gateway, requests } = gatewayFor({ status: 201, data: created });
    const input = {
      title: 'Read',
      description: null,
      recurrence: { kind: 'weekly' as const, weekdays: [1 as const], interval: 1 },
      startDate: '2026-10-07',
    };

    await expect(gateway.create(input)).resolves.toEqual(created);

    expect(requests[0]).toMatchObject({ method: 'post', url: '/habits', body: input });
  });

  it('updates the whole habit, start date included', async () => {
    const { gateway, requests } = gatewayFor({ status: 204 });
    const input = {
      title: 'Stretch',
      description: 'Morning',
      recurrence: {
        kind: 'monthlyOnWeekday' as const,
        occurrence: 'last' as const,
        weekday: 6 as const,
      },
      startDate: '2026-09-01',
    };

    await gateway.update('h-1', input);

    expect(requests[0]).toMatchObject({ method: 'put', url: '/habits/h-1', body: input });
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

  it('puts a tag on a day with PUT on the day’s own address and returns the day', async () => {
    const day = { date: '2026-10-07', tags: [{ id: 't-1', name: 'krank' }] };
    const { gateway, requests } = gatewayFor({ status: 200, data: day });

    await expect(gateway.tagDay('h-1', '2026-10-07', 't-1')).resolves.toEqual(day);

    expect(requests[0]).toMatchObject({
      method: 'put',
      url: '/habits/h-1/days/2026-10-07/tags/t-1',
    });
  });

  it('takes a tag off a day with DELETE and returns the day', async () => {
    const day = { date: '2026-10-07', tags: [] };
    const { gateway, requests } = gatewayFor({ status: 200, data: day });

    await expect(gateway.untagDay('h-1', '2026-10-07', 't-1')).resolves.toEqual(day);

    expect(requests[0]).toMatchObject({
      method: 'delete',
      url: '/habits/h-1/days/2026-10-07/tags/t-1',
    });
  });

  describe('parts of a habit', () => {
    const part = { id: 's-1', title: 'Legs', weekdays: [1, 4] };

    it('adds a part with POST on the habit and returns it', async () => {
      const { gateway, requests } = gatewayFor({ status: 201, data: part });

      await expect(
        gateway.addSubHabit('h-1', { title: 'Legs', weekdays: [1, 4] }),
      ).resolves.toEqual(part);

      expect(requests[0]).toMatchObject({
        method: 'post',
        url: '/habits/h-1/sub-habits',
        body: { title: 'Legs', weekdays: [1, 4] },
      });
    });

    it('changes a part with PUT on the part and returns it', async () => {
      const { gateway, requests } = gatewayFor({ status: 200, data: part });

      await expect(
        gateway.updateSubHabit('h-1', 's-1', { title: 'Legs', weekdays: [1, 4] }),
      ).resolves.toEqual(part);

      expect(requests[0]).toMatchObject({
        method: 'put',
        url: '/habits/h-1/sub-habits/s-1',
        body: { title: 'Legs', weekdays: [1, 4] },
      });
    });

    it('removes a part with DELETE', async () => {
      const { gateway, requests } = gatewayFor({ status: 204 });

      await gateway.removeSubHabit('h-1', 's-1');

      expect(requests[0]).toMatchObject({ method: 'delete', url: '/habits/h-1/sub-habits/s-1' });
    });

    it('does not treat removing a part that is gone as a failure, but reports the rest', async () => {
      const gone = gatewayFor({ status: 404, data: { title: 'Not found' } });
      await expect(gone.gateway.removeSubHabit('h-1', 's-1')).resolves.toBeUndefined();

      const broken = gatewayFor({ status: 500 });
      await expect(broken.gateway.removeSubHabit('h-1', 's-1')).rejects.toMatchObject({
        status: 500,
      });
    });

    it('ticks a part on a day with PUT on the day’s own address', async () => {
      const day = { date: '2026-10-07', habitCompleted: true, completedSubHabitIds: ['s-1'] };
      const { gateway, requests } = gatewayFor({ status: 200, data: day });

      await expect(gateway.markSubHabit('h-1', 's-1', '2026-10-07')).resolves.toBeUndefined();

      expect(requests[0]).toMatchObject({
        method: 'put',
        url: '/habits/h-1/sub-habits/s-1/records/2026-10-07',
      });
    });

    it('takes a part’s tick back with DELETE, and a tick that is not there is not a failure', async () => {
      const day = { date: '2026-10-07', habitCompleted: false, completedSubHabitIds: [] };
      const taken = gatewayFor({ status: 200, data: day });
      await taken.gateway.unmarkSubHabit('h-1', 's-1', '2026-10-07');
      expect(taken.requests[0]).toMatchObject({
        method: 'delete',
        url: '/habits/h-1/sub-habits/s-1/records/2026-10-07',
      });

      const missing = gatewayFor({ status: 404, data: { title: 'Not found' } });
      await expect(
        missing.gateway.unmarkSubHabit('h-1', 's-1', '2026-10-07'),
      ).resolves.toBeUndefined();

      const broken = gatewayFor({ status: 500 });
      await expect(broken.gateway.unmarkSubHabit('h-1', 's-1', '2026-10-07')).rejects.toMatchObject(
        { status: 500 },
      );
    });

    it('reports a failed tick, a failed add and a refused change as they are', async () => {
      const refusal = { status: 400, data: { title: 'A business rule was violated.' } };
      const { gateway } = gatewayFor(refusal);

      await expect(gateway.markSubHabit('h-1', 's-1', '2026-10-07')).rejects.toMatchObject({
        status: 400,
      });
      await expect(
        gateway.addSubHabit('h-1', { title: 'Legs', weekdays: [1] }),
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        gateway.updateSubHabit('h-1', 's-1', { title: 'Legs', weekdays: [1] }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  it('reports a 404 of any other call', async () => {
    const { gateway } = gatewayFor({ status: 404, data: { title: 'Not found' } });

    await expect(gateway.details('h-1')).rejects.toBeInstanceOf(ApiError);
    await expect(gateway.mark('h-1', '2026-10-07')).rejects.toMatchObject({ status: 404 });
  });
});
