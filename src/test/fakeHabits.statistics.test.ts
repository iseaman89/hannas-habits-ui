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
      {
        id: 'legs',
        title: 'Legs',
        weekdays: [1],
        planned: 2,
        done: 1,
        lastDoneOn: '2026-10-06',
        currentStreak: 0, // Monday 12 was due and missed
        longestStreak: 1, // Monday 5; the Tuesday tick is not a due day
      },
      {
        id: 'arms',
        title: 'Arms',
        weekdays: [4],
        planned: 2,
        done: 0,
        lastDoneOn: null,
        currentStreak: 0,
        longestStreak: 0,
      },
    ]);
  });

  describe('the streaks', () => {
    // The same cases as the backend's HabitStreak tests: that rule is the reference.
    const streaksOf = async (habit: FakeHabit, asOf: string, range = OCTOBER) => {
      const stats = await statisticsOf(habit, asOf, range);
      return [stats.currentStreak, stats.longestStreak];
    };

    it('counts the due days in a row back from the day, and the best run of the whole history', async () => {
      // Thu 1, Mon 5, Thu 8 done (three in a row), Mon 12 missed, Thu 15 done.
      const habit = gym({ completed: ['2026-10-01', '2026-10-05', '2026-10-08', '2026-10-15'] });

      expect(await streaksOf(habit, '2026-10-15')).toEqual([1, 3]);
    });

    it('does not depend on the range', async () => {
      const habit = gym({ completed: ['2026-10-01', '2026-10-05', '2026-10-08', '2026-10-15'] });

      expect(
        await streaksOf(habit, '2026-10-15', { from: '2026-01-01', to: '2026-01-31' }),
      ).toEqual([1, 3]);
    });

    it('skips a due day that is still open today, it is no break', async () => {
      expect(
        await streaksOf(gym({ completed: ['2026-10-01', '2026-10-05'] }), '2026-10-08'),
      ).toEqual([2, 2]);
    });

    it('lets a day that was not due neither count nor break', async () => {
      // Tuesday 6th is not a Monday/Thursday: the tick is ignored, the run is Thu 1 + Mon 5.
      const habit = gym({ completed: ['2026-10-01', '2026-10-05', '2026-10-06'] });

      expect(await streaksOf(habit, '2026-10-07')).toEqual([2, 2]);
    });

    it('ignores a record after today and the days before the start', async () => {
      const habit = gym({
        startDate: '2026-10-05',
        completed: ['2026-10-01', '2026-10-05', '2026-10-12'],
      });

      // Mon 5 is the first due day and done; Thu 8 is due and still open (skipped). The tick on Thu 1 lies
      // before the start and the one on Mon 12 after "today".
      expect(await streaksOf(habit, '2026-10-08')).toEqual([1, 1]);
    });

    it('counts a quota in weeks, skipping the running week that has not reached its number', async () => {
      const run: FakeHabit = {
        id: 'run',
        title: 'Run',
        recurrence: recurrenceOf({ kind: 'timesPerWeek', times: 2 }, '2026-09-01'),
        startDate: '2026-09-01',
        completed: [
          // three met weeks in September ...
          '2026-09-01',
          '2026-09-02',
          '2026-09-08',
          '2026-09-09',
          '2026-09-15',
          '2026-09-16',
          // ... a week without, then the weeks of 28 Sep and 5 Oct; the running week has one
          '2026-09-29',
          '2026-10-01',
          '2026-10-06',
          '2026-10-08',
          '2026-10-13',
        ],
      };

      expect(await streaksOf(run, '2026-10-15')).toEqual([2, 3]);
    });

    it('counts only the marks from the start date towards the first week of a quota', async () => {
      const run = (completed: string[]): FakeHabit => ({
        id: 'run',
        title: 'Run',
        recurrence: recurrenceOf({ kind: 'timesPerWeek', times: 3 }, '2026-10-07'),
        startDate: '2026-10-07', // a Wednesday
        completed,
      });

      // Monday and Tuesday lie before the start: only the Wednesday counts. Wed, Thu, Fri are enough.
      expect(
        await streaksOf(run(['2026-10-05', '2026-10-06', '2026-10-07']), '2026-10-09'),
      ).toEqual([0, 0]);
      expect(
        await streaksOf(run(['2026-10-07', '2026-10-08', '2026-10-09']), '2026-10-09'),
      ).toEqual([1, 1]);
    });

    it('counts a monthly quota in months', async () => {
      const swim = (completed: string[]): FakeHabit => ({
        id: 'swim',
        title: 'Swim',
        recurrence: recurrenceOf({ kind: 'timesPerMonth', times: 2 }, '2026-07-01'),
        startDate: '2026-07-01',
        completed,
      });
      const base = ['2026-08-01', '2026-08-02', '2026-09-05', '2026-10-02', '2026-10-03'];

      // September fell short: August and October are two runs of one.
      expect(await streaksOf(swim(base), '2026-10-08')).toEqual([1, 1]);
      expect(await streaksOf(swim([...base, '2026-09-20']), '2026-10-08')).toEqual([3, 3]);
    });

    it('counts a part on its own days, in days, also under a quota habit', async () => {
      const run: FakeHabit = {
        id: 'run',
        title: 'Run',
        recurrence: recurrenceOf({ kind: 'timesPerWeek', times: 3 }, '2026-09-01'),
        startDate: '2026-09-01',
        completed: [],
        subHabits: [
          { id: 'long', title: 'Long', weekdays: [1], completed: ['2026-09-28', '2026-10-05'] },
        ],
      };
      const [stats] = await fakeHabits([run]).gateway.statistics({
        ...OCTOBER,
        asOf: '2026-10-07',
      });

      // Mondays 28 Sep and 5 Oct - the Mondays before them were missed.
      expect(stats?.subHabits[0]).toMatchObject({ currentStreak: 2, longestStreak: 2 });
    });

    it('is zero for a habit that was never done, and before the start', async () => {
      expect(await streaksOf(gym(), '2026-10-31')).toEqual([0, 0]);
      expect(await streaksOf(gym({ startDate: '2026-11-01' }), '2026-10-31')).toEqual([0, 0]);
    });
  });

  it('writes the call down', async () => {
    const fake = fakeHabits([gym()]);

    await fake.gateway.statistics({ ...OCTOBER, asOf: '2026-10-07' });

    expect(fake.calls.statistics).toEqual([{ ...OCTOBER, asOf: '2026-10-07' }]);
  });
});
