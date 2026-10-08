import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { habitKeys } from './habitQueries';
import type { HabitOverview, OverviewQuery } from './habitsGateway';
import { applyCompletion, withCompletion } from './overviewCache';

function habit(id: string, completedDates: string[], currentStreak = 0): HabitOverview {
  return {
    id,
    title: `Habit ${id}`,
    schedule: [0, 1, 2, 3, 4, 5, 6],
    startDate: '2026-01-01',
    completedDates,
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
