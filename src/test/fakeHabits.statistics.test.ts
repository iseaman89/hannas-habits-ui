import { describe, expect, it } from 'vitest';
import { fakeHabits, type FakeHabit } from './fakeHabits';
import { recurrenceOf } from './recurrence';

// October 2026: Thu 1, Mon 5, Thu 8, Mon 12, Thu 15 ... weeks: 28 Sep-4 Oct | 5-11 | 12-18 | 19-25 | 26 Oct-1 Nov.
const OCTOBER = { from: '2026-10-01', to: '2026-10-31' };

const gym = (extra: Partial<FakeHabit> = {}): FakeHabit => ({
  id: 'gym',
  title: 'Gym',
  weekdays: [1, 4], // Monday and Thursday
  startDate: '2026-01-01',
  completed: [],
  ...extra,
});

async function statisticsOf(habit: FakeHabit, asOf: string, range = OCTOBER) {
  const [statistics] = await fakeHabits([habit]).gateway.statistics({ ...range, asOf });
  if (!statistics) throw new Error('no statistic');
  return statistics;
}

/**
 * The stand-in server counts like the backend's `HabitStatistics` (whose tests are the reference).
 * The numbers here can be counted off a calendar; they are the same cases as in the Domain tests.
 */
describe('fakeHabits().gateway.statistics', () => {
  it('counts the due days up to the day and how many were done', async () => {
    const stats = await statisticsOf(
      gym({ completed: ['2026-10-01', '2026-10-05', '2026-10-12'] }),
      '2026-10-14',
    );

    // Due so far: Thu 1, Mon 5, Thu 8, Mon 12.
    expect(stats).toMatchObject({ unit: 'days', planned: 4, done: 3, lastDoneOn: '2026-10-12' });
  });

  it('does not count a day that was done but not due', async () => {
    const stats = await statisticsOf(
      gym({ completed: ['2026-10-06', '2026-10-10', '2026-10-08'] }),
      '2026-10-31',
    );

    expect(stats).toMatchObject({ planned: 9, done: 1 });
  });

  it('treats an open today as no miss yet, and a done one as planned and done', async () => {
    const open = await statisticsOf(gym({ completed: ['2026-10-01', '2026-10-05'] }), '2026-10-08');
    const done = await statisticsOf(gym({ completed: ['2026-10-01', '2026-10-08'] }), '2026-10-08');

    expect(open).toMatchObject({ planned: 2, done: 2 });
    expect(done).toMatchObject({ planned: 3, done: 2 });
  });

  it('ignores a record after today, and the days before the start', async () => {
    const stats = await statisticsOf(
      gym({ startDate: '2026-10-06', completed: ['2026-10-05', '2026-10-15'] }),
      '2026-10-14',
    );

    // Thu 8 and Mon 12 are due; the Monday before the start is not; Thu 15 is "tomorrow".
    expect(stats).toMatchObject({ planned: 2, done: 0, lastDoneOn: '2026-10-05' });
  });

  it('reads the last day over the whole history, not the range', async () => {
    const stats = await statisticsOf(
      gym({ completed: ['2026-08-03', '2026-10-05'] }),
      '2026-10-08',
      { from: '2026-09-01', to: '2026-09-30' },
    );

    expect(stats.lastDoneOn).toBe('2026-10-05');
  });

  it('has no last day for a habit that was never done', async () => {
    expect((await statisticsOf(gym(), '2026-10-31')).lastDoneOn).toBeNull();
  });

  it('counts a weekly quota in the weeks that end in the range', async () => {
    const stats = await statisticsOf(
      {
        id: 'run',
        title: 'Run',
        recurrence: recurrenceOf({ kind: 'timesPerWeek', times: 3 }, '2026-01-01'),
        startDate: '2026-01-01',
        completed: [
          '2026-09-29',
          '2026-10-01',
          '2026-10-03',
          '2026-10-05',
          '2026-10-09',
          '2026-10-12',
          '2026-10-14',
          '2026-10-16',
        ],
      },
      '2026-10-31',
    );

    // 28 Sep-4 Oct: 3 (met) · 5-11: 2 · 12-18: 3 (met) · 19-25: 0.
    expect(stats).toMatchObject({ unit: 'weeks', planned: 4, done: 2 });
  });

  it('judges a running week only once it has reached its number, and not the week of the start', async () => {
    const run = (completed: string[]): FakeHabit => ({
      id: 'run',
      title: 'Run',
      recurrence: recurrenceOf({ kind: 'timesPerWeek', times: 3 }, '2026-01-01'),
      startDate: '2026-10-07',
      completed,
    });

    const reached = await statisticsOf(
      run(['2026-10-12', '2026-10-13', '2026-10-14']),
      '2026-10-14',
    );
    const behind = await statisticsOf(run(['2026-10-12', '2026-10-13']), '2026-10-14');

    // The week of 5-11 began before the habit (not judged); 12-18 is running.
    expect(reached).toMatchObject({ planned: 1, done: 1 });
    expect(behind).toMatchObject({ planned: 0, done: 0 });
  });

  it('counts a monthly quota in months', async () => {
    const stats = await statisticsOf(
      {
        id: 'swim',
        title: 'Swim',
        recurrence: recurrenceOf({ kind: 'timesPerMonth', times: 2 }, '2026-01-01'),
        startDate: '2026-01-01',
        completed: ['2026-10-03', '2026-10-20'],
      },
      '2026-11-02',
    );

    expect(stats).toMatchObject({ unit: 'months', planned: 1, done: 1 });
  });

  it('counts a part on its own weekdays, in days, with its own last day', async () => {
    const [stats] = await fakeHabits([
      gym({
        subHabits: [
          { id: 'legs', title: 'Legs', weekdays: [1], completed: ['2026-10-05', '2026-10-06'] },
          { id: 'arms', title: 'Arms', weekdays: [4] },
        ],
      }),
    ]).gateway.statistics({ ...OCTOBER, asOf: '2026-10-14' });

    // Legs on Mondays: 5 and 12 (the Tuesday tick is not due). Arms on Thursdays: 1 and 8.
    expect(stats?.subHabits).toEqual([
      { id: 'legs', title: 'Legs', weekdays: [1], planned: 2, done: 1, lastDoneOn: '2026-10-06' },
      { id: 'arms', title: 'Arms', weekdays: [4], planned: 2, done: 0, lastDoneOn: null },
    ]);
  });

  it('writes the call down', async () => {
    const fake = fakeHabits([gym()]);

    await fake.gateway.statistics({ ...OCTOBER, asOf: '2026-10-07' });

    expect(fake.calls.statistics).toEqual([{ ...OCTOBER, asOf: '2026-10-07' }]);
  });
});
