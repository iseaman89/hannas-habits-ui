import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { habitKeys } from './habitQueries';
import { weeklyRecurrence } from '@/test/recurrence';
import type { HabitOverview, OverviewQuery } from './habitsGateway';
import {
  applyCompletion,
  applyDayTags,
  applyTagChange,
  withCompletion,
  withDayTags,
  withTagChange,
} from './overviewCache';

function habit(id: string, completedDates: string[], currentStreak = 0): HabitOverview {
  return {
    id,
    title: `Habit ${id}`,
    recurrence: weeklyRecurrence([0, 1, 2, 3, 4, 5, 6]),
    startDate: '2026-01-01',
    scheduledDates: [],
    completedDates,
    taggedDays: [],
    quotaPeriods: [],
    currentStreak,
  };
}

describe('withCompletion', () => {
  it('adds a done day and keeps the days oldest first', () => {
    const [changed] = withCompletion([habit('a', ['2026-10-02', '2026-10-09'])], {
      habitId: 'a',
      date: '2026-10-05',
      done: true,
    });

    expect(changed?.completedDates).toEqual(['2026-10-02', '2026-10-05', '2026-10-09']);
  });

  it('takes a day away', () => {
    const [changed] = withCompletion([habit('a', ['2026-10-02', '2026-10-05'])], {
      habitId: 'a',
      date: '2026-10-02',
      done: false,
    });

    expect(changed?.completedDates).toEqual(['2026-10-05']);
  });

  it('does not duplicate a day that is already done, and ignores one that is already open', () => {
    const habits = [habit('a', ['2026-10-05'])];

    expect(
      withCompletion(habits, { habitId: 'a', date: '2026-10-05', done: true })[0]?.completedDates,
    ).toEqual(['2026-10-05']);
    expect(
      withCompletion(habits, { habitId: 'a', date: '2026-10-06', done: false })[0]?.completedDates,
    ).toEqual(['2026-10-05']);
  });

  it('touches only the habit asked for, and not the streak', () => {
    const habits = [habit('a', [], 3), habit('b', [], 5)];

    const result = withCompletion(habits, { habitId: 'a', date: '2026-10-05', done: true });

    expect(result[0]).toMatchObject({ completedDates: ['2026-10-05'], currentStreak: 3 });
    expect(result[1]).toBe(habits[1]);
  });

  it('leaves the list it was given alone', () => {
    const habits = [habit('a', ['2026-10-05'])];

    withCompletion(habits, { habitId: 'a', date: '2026-10-06', done: true });

    expect(habits[0]?.completedDates).toEqual(['2026-10-05']);
  });
});

describe('withCompletion for a quota habit', () => {
  const week = { from: '2026-10-05', to: '2026-10-11', done: 2 };
  const nextWeek = { from: '2026-10-12', to: '2026-10-18', done: 0 };
  const quota = (completedDates: string[], startDate = '2026-01-01'): HabitOverview => ({
    ...habit('q', completedDates),
    startDate,
    quotaPeriods: [{ from: '2026-09-28', to: '2026-10-04', done: 3 }, week, nextWeek],
  });
  const doneOf = (habits: readonly HabitOverview[]) => habits[0]?.quotaPeriods.map((p) => p.done);

  it('counts a day that is ticked into the week it is in, and no other', () => {
    const result = withCompletion([quota(['2026-10-05', '2026-10-06'])], {
      habitId: 'q',
      date: '2026-10-08',
      done: true,
    });

    expect(doneOf(result)).toEqual([3, 3, 0]);
  });

  it('takes a day that is unticked out of its week again', () => {
    const result = withCompletion([quota(['2026-10-05', '2026-10-06'])], {
      habitId: 'q',
      date: '2026-10-06',
      done: false,
    });

    expect(doneOf(result)).toEqual([3, 1, 0]);
  });

  it('counts the first and the last day of a week into it', () => {
    const first = withCompletion([quota([])], { habitId: 'q', date: '2026-10-05', done: true });
    const last = withCompletion([quota([])], { habitId: 'q', date: '2026-10-11', done: true });

    expect(doneOf(first)).toEqual([3, 3, 0]);
    expect(doneOf(last)).toEqual([3, 3, 0]);
  });

  it('counts a day once, however often it is written', () => {
    const habits = [quota(['2026-10-06'])];

    expect(
      doneOf(withCompletion(habits, { habitId: 'q', date: '2026-10-06', done: true })),
    ).toEqual([3, 2, 0]);
    expect(
      doneOf(withCompletion(habits, { habitId: 'q', date: '2026-10-07', done: false })),
    ).toEqual([3, 2, 0]);
  });

  it('leaves the count of a day before the start alone: the server does not count it either', () => {
    const habits = [quota([], '2026-10-08')];

    const result = withCompletion(habits, { habitId: 'q', date: '2026-10-06', done: true });

    expect(doneOf(result)).toEqual([3, 2, 0]);
    expect(result[0]?.completedDates).toEqual(['2026-10-06']);
  });

  it('never goes below zero', () => {
    const habits = [{ ...quota(['2026-10-13']), quotaPeriods: [{ ...nextWeek, done: 0 }] }];

    const result = withCompletion(habits, { habitId: 'q', date: '2026-10-13', done: false });

    expect(doneOf(result)).toEqual([0]);
  });

  it('is the inverse of itself: tick and untick leave the counts as they were', () => {
    const habits = [quota([])];

    const ticked = withCompletion(habits, { habitId: 'q', date: '2026-10-09', done: true });
    const back = withCompletion(ticked, { habitId: 'q', date: '2026-10-09', done: false });

    expect(doneOf(back)).toEqual(doneOf(habits));
  });

  it('has nothing to change for a habit without periods', () => {
    const [changed] = withCompletion([habit('a', [])], {
      habitId: 'a',
      date: '2026-10-05',
      done: true,
    });

    expect(changed?.quotaPeriods).toEqual([]);
  });
});

describe('applyCompletion', () => {
  const october: OverviewQuery = { from: '2026-10-01', to: '2026-10-31', asOf: '2026-10-07' };
  const november: OverviewQuery = { from: '2026-11-01', to: '2026-11-30', asOf: '2026-10-07' };
  const oneDay: OverviewQuery = { from: '2026-10-05', to: '2026-10-05', asOf: '2026-10-07' };

  function client() {
    const queryClient = new QueryClient();
    queryClient.setQueryData(habitKeys.overview(october), [habit('a', [])]);
    queryClient.setQueryData(habitKeys.overview(november), [habit('a', [])]);
    queryClient.setQueryData(habitKeys.overview(oneDay), [habit('a', [])]);
    return queryClient;
  }

  const dates = (queryClient: QueryClient, query: OverviewQuery) =>
    queryClient.getQueryData<HabitOverview[]>(habitKeys.overview(query))?.[0]?.completedDates;

  it('writes the day into every loaded overview that covers it', () => {
    const queryClient = client();

    applyCompletion(queryClient, { habitId: 'a', date: '2026-10-05', done: true });

    expect(dates(queryClient, october)).toEqual(['2026-10-05']);
    expect(dates(queryClient, oneDay)).toEqual(['2026-10-05']);
  });

  it('leaves the overviews of other ranges alone, the first and last day included in range', () => {
    const queryClient = client();

    applyCompletion(queryClient, { habitId: 'a', date: '2026-10-31', done: true });
    applyCompletion(queryClient, { habitId: 'a', date: '2026-11-01', done: true });

    expect(dates(queryClient, october)).toEqual(['2026-10-31']);
    expect(dates(queryClient, november)).toEqual(['2026-11-01']);
    expect(dates(queryClient, oneDay)).toEqual([]);
  });

  it('does nothing for a query nobody has loaded', () => {
    const queryClient = new QueryClient();

    applyCompletion(queryClient, { habitId: 'a', date: '2026-10-05', done: true });

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});

describe('tags on days', () => {
  const sick = { id: 't-sick', name: 'sick' };
  const trip = { id: 't-trip', name: 'trip' };
  const withDays = (id: string, taggedDays: HabitOverview['taggedDays']): HabitOverview => ({
    ...habit(id, []),
    taggedDays,
  });

  describe('withTagChange', () => {
    it('puts a tag on a day that had none, keeping the days oldest first', () => {
      const habits = [withDays('a', [{ date: '2026-10-09', tags: [trip] }])];

      const [changed] = withTagChange(habits, {
        habitId: 'a',
        date: '2026-10-05',
        tag: sick,
        present: true,
      });

      expect(changed?.taggedDays).toEqual([
        { date: '2026-10-05', tags: [sick] },
        { date: '2026-10-09', tags: [trip] },
      ]);
    });

    it('adds to the tags a day has, by name', () => {
      const habits = [withDays('a', [{ date: '2026-10-05', tags: [trip] }])];

      const [changed] = withTagChange(habits, {
        habitId: 'a',
        date: '2026-10-05',
        tag: sick,
        present: true,
      });

      expect(changed?.taggedDays).toEqual([{ date: '2026-10-05', tags: [sick, trip] }]);
    });

    it('takes a tag off, and the day goes when its last tag does', () => {
      const habits = [
        withDays('a', [
          { date: '2026-10-05', tags: [sick, trip] },
          { date: '2026-10-06', tags: [sick] },
        ]),
      ];

      const [partly] = withTagChange(habits, {
        habitId: 'a',
        date: '2026-10-05',
        tag: sick,
        present: false,
      });
      const [gone] = withTagChange(habits, {
        habitId: 'a',
        date: '2026-10-06',
        tag: sick,
        present: false,
      });

      expect(partly?.taggedDays[0]).toEqual({ date: '2026-10-05', tags: [trip] });
      expect(gone?.taggedDays).toEqual([{ date: '2026-10-05', tags: [sick, trip] }]);
    });

    it('is the same twice: a tag is on a day once, and taking off what is not there is nothing', () => {
      const habits = [withDays('a', [{ date: '2026-10-05', tags: [sick] }])];
      const put = { habitId: 'a', date: '2026-10-05', tag: sick, present: true };

      expect(withTagChange(habits, put)).toEqual(habits);
      expect(
        withTagChange(habits, { ...put, date: '2026-10-07', tag: trip, present: false }),
      ).toEqual(habits);
    });

    it('leaves the other habits alone', () => {
      const habits = [withDays('a', []), withDays('b', [])];

      const [a, b] = withTagChange(habits, {
        habitId: 'a',
        date: '2026-10-05',
        tag: sick,
        present: true,
      });

      expect(a?.taggedDays).toHaveLength(1);
      expect(b).toBe(habits[1]);
    });
  });

  describe('withDayTags', () => {
    it('replaces what the day carried with what the server says', () => {
      const habits = [withDays('a', [{ date: '2026-10-05', tags: [sick] }])];

      const [changed] = withDayTags(habits, { habitId: 'a', date: '2026-10-05', tags: [trip] });

      expect(changed?.taggedDays).toEqual([{ date: '2026-10-05', tags: [trip] }]);
    });

    it('drops the day for an empty answer', () => {
      const habits = [withDays('a', [{ date: '2026-10-05', tags: [sick] }])];

      const [changed] = withDayTags(habits, { habitId: 'a', date: '2026-10-05', tags: [] });

      expect(changed?.taggedDays).toEqual([]);
    });
  });

  describe('in the query cache', () => {
    function cacheWith(...ranges: OverviewQuery[]) {
      const queryClient = new QueryClient();
      for (const range of ranges) {
        queryClient.setQueryData(habitKeys.overview(range), [withDays('a', [])]);
      }
      return queryClient;
    }
    const october: OverviewQuery = { from: '2026-10-01', to: '2026-10-31', asOf: '2026-10-07' };
    const november: OverviewQuery = { from: '2026-11-01', to: '2026-11-30', asOf: '2026-10-07' };
    const tagsOf = (queryClient: QueryClient, range: OverviewQuery) =>
      queryClient.getQueryData<HabitOverview[]>(habitKeys.overview(range))?.[0]?.taggedDays;

    it('changes every loaded overview that covers the day, and only those', () => {
      const queryClient = cacheWith(october, november);

      applyTagChange(queryClient, {
        habitId: 'a',
        date: '2026-10-05',
        tag: sick,
        present: true,
      });

      expect(tagsOf(queryClient, october)).toEqual([{ date: '2026-10-05', tags: [sick] }]);
      expect(tagsOf(queryClient, november)).toEqual([]);
    });

    it('takes the server’s answer for a day', () => {
      const queryClient = cacheWith(october);

      applyDayTags(queryClient, { habitId: 'a', date: '2026-10-31', tags: [sick, trip] });

      expect(tagsOf(queryClient, october)).toEqual([{ date: '2026-10-31', tags: [sick, trip] }]);
    });
  });
});
