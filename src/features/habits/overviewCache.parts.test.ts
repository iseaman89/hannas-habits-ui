import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { weeklyRecurrence } from '@/test/recurrence';
import { habitKeys } from './habitQueries';
import type { HabitOverview, OverviewQuery } from './habitsGateway';
import {
  applyCompletion,
  applySubHabitCompletion,
  withCompletion,
  withSubHabitCompletion,
} from './overviewCache';
import type { SubHabit } from './subHabits';

/** 2026-10-05 is a Monday, 2026-10-07 a Wednesday. */
const MONDAY = '2026-10-05';
const WEDNESDAY = '2026-10-07';

function part(
  id: string,
  scheduledDates: string[],
  completedDates: string[] = [],
  weekdays: SubHabit['weekdays'] = [1],
): SubHabit {
  return { id, title: id, weekdays, scheduledDates, completedDates, notes: [] };
}

function sport(subHabits: SubHabit[], completedDates: string[] = []): HabitOverview {
  return {
    id: 'sport',
    title: 'Sport',
    recurrence: weeklyRecurrence([1, 3]),
    startDate: '2026-01-01',
    scheduledDates: [MONDAY, WEDNESDAY],
    completedDates,
    taggedDays: [],
    quotaPeriods: [],
    currentStreak: 2,
    subHabits,
  };
}

const tick = (subHabitId: string, date: string, done: boolean) => ({
  habitId: 'sport',
  subHabitId,
  date,
  done,
});

describe('withCompletion and the parts of the day', () => {
  it('ticks the parts that are due that day and leaves the others alone', () => {
    const legs = part('legs', [MONDAY]);
    const arms = part('arms', [WEDNESDAY], [], [3]);

    const [changed] = withCompletion([sport([legs, arms])], {
      habitId: 'sport',
      date: MONDAY,
      done: true,
    });

    expect(changed?.completedDates).toEqual([MONDAY]);
    expect(changed?.subHabits.map((p) => p.completedDates)).toEqual([[MONDAY], []]);
  });

  it('clears every part’s tick of the day when the habit’s day is taken back, also a part that was not due', () => {
    const legs = part('legs', [MONDAY], [MONDAY, '2026-10-12']);
    const stray = part('arms', [WEDNESDAY], [MONDAY], [3]);

    const [changed] = withCompletion([sport([legs, stray], [MONDAY])], {
      habitId: 'sport',
      date: MONDAY,
      done: false,
    });

    expect(changed?.completedDates).toEqual([]);
    // Other days of the part stay.
    expect(changed?.subHabits.map((p) => p.completedDates)).toEqual([['2026-10-12'], []]);
  });

  it('keeps a part that is done already as it is, ticks once', () => {
    const legs = part('legs', [MONDAY], [MONDAY]);

    const [changed] = withCompletion([sport([legs])], {
      habitId: 'sport',
      date: MONDAY,
      done: true,
    });

    expect(changed?.subHabits[0]).toBe(legs);
  });

  it('is the inverse of itself on a day with due parts', () => {
    const before = sport([part('legs', [MONDAY]), part('core', [MONDAY], [], [1])]);

    const ticked = withCompletion([before], { habitId: 'sport', date: MONDAY, done: true });
    const back = withCompletion(ticked, { habitId: 'sport', date: MONDAY, done: false });

    expect(back[0]).toEqual(before);
  });

  it('leaves a habit without parts as it was before parts existed', () => {
    const [changed] = withCompletion([sport([])], { habitId: 'sport', date: MONDAY, done: true });

    expect(changed).toEqual({ ...sport([]), completedDates: [MONDAY] });
  });
});

describe('withSubHabitCompletion', () => {
  it('ticks the part and, when it was the last due one, completes the habit’s day', () => {
    const legs = part('legs', [MONDAY], [MONDAY]);
    const core = part('core', [MONDAY]);

    const [changed] = withSubHabitCompletion([sport([legs, core])], tick('core', MONDAY, true));

    expect(changed?.subHabits.map((p) => p.completedDates)).toEqual([[MONDAY], [MONDAY]]);
    expect(changed?.completedDates).toEqual([MONDAY]);
  });

  it('leaves the habit’s day open while another due part is open', () => {
    const legs = part('legs', [MONDAY]);
    const core = part('core', [MONDAY]);

    const [changed] = withSubHabitCompletion([sport([legs, core])], tick('legs', MONDAY, true));

    expect(changed?.subHabits.map((p) => p.completedDates)).toEqual([[MONDAY], []]);
    expect(changed?.completedDates).toEqual([]);
  });

  it('takes the habit’s day back when a due part is taken back', () => {
    const legs = part('legs', [MONDAY], [MONDAY]);
    const core = part('core', [MONDAY], [MONDAY]);

    const [changed] = withSubHabitCompletion(
      [sport([legs, core], [MONDAY])],
      tick('legs', MONDAY, false),
    );

    expect(changed?.subHabits.map((p) => p.completedDates)).toEqual([[], [MONDAY]]);
    expect(changed?.completedDates).toEqual([]);
  });

  it('only marks a day the part is not due on, and never completes the habit’s day', () => {
    const legs = part('legs', [MONDAY]); // Monday only
    const arms = part('arms', [WEDNESDAY], [], [3]);

    // Legs ticked on Wednesday: not due, a mark only - arms is the one still open.
    const [marked] = withSubHabitCompletion([sport([legs, arms])], tick('legs', WEDNESDAY, true));
    expect(marked?.subHabits[0]?.completedDates).toEqual([WEDNESDAY]);
    expect(marked?.completedDates).toEqual([]);

    // Even when it would "finish" the day on paper: a part that is not due is no due part.
    const lonely = part('legs', [MONDAY]);
    const [lone] = withSubHabitCompletion([sport([lonely])], tick('legs', WEDNESDAY, true));
    expect(lone?.completedDates).toEqual([]);
  });

  it('leaves a day that is done on its own alone when a part that is not due is taken back', () => {
    const legs = part('legs', [MONDAY], [WEDNESDAY]);

    const [changed] = withSubHabitCompletion(
      [sport([legs], [WEDNESDAY])],
      tick('legs', WEDNESDAY, false),
    );

    expect(changed?.completedDates).toEqual([WEDNESDAY]);
    expect(changed?.subHabits[0]?.completedDates).toEqual([]);
  });

  it('does not change a day that is done already when a due part is ticked again', () => {
    const legs = part('legs', [MONDAY], [MONDAY]);
    const habits = [sport([legs], [MONDAY])];

    const [changed] = withSubHabitCompletion(habits, tick('legs', MONDAY, true));

    expect(changed?.completedDates).toEqual([MONDAY]);
    expect(changed?.subHabits[0]).toBe(legs);
  });

  it('counts the habit’s day into the week of a quota habit', () => {
    const legs = part('legs', [MONDAY]);
    const habit: HabitOverview = {
      ...sport([legs]),
      quotaPeriods: [{ from: '2026-10-05', to: '2026-10-11', done: 1 }],
    };

    const [changed] = withSubHabitCompletion([habit], tick('legs', MONDAY, true));

    expect(changed?.quotaPeriods).toEqual([{ from: '2026-10-05', to: '2026-10-11', done: 2 }]);
  });

  it('is the inverse of itself', () => {
    const before = sport([part('legs', [MONDAY]), part('core', [MONDAY], [], [1])]);

    const ticked = withSubHabitCompletion(
      withSubHabitCompletion([before], tick('legs', MONDAY, true)),
      tick('core', MONDAY, true),
    );
    expect(ticked[0]?.completedDates).toEqual([MONDAY]);

    const back = withSubHabitCompletion(
      withSubHabitCompletion(ticked, tick('core', MONDAY, false)),
      tick('legs', MONDAY, false),
    );
    expect(back[0]).toEqual(before);
  });

  it('touches only the habit asked for, and not its streak', () => {
    const other = { ...sport([part('legs', [MONDAY])]), id: 'other' };
    const habits = [sport([part('legs', [MONDAY])]), other];

    const result = withSubHabitCompletion(habits, tick('legs', MONDAY, true));

    expect(result[0]).toMatchObject({ currentStreak: 2, completedDates: [MONDAY] });
    expect(result[1]).toBe(other);
  });

  it('ignores a part the habit does not have (it was removed on another device)', () => {
    const habits = [sport([part('legs', [MONDAY])])];

    const [same] = withSubHabitCompletion(habits, tick('gone', MONDAY, true));

    expect(same).toBe(habits[0]);
  });

  it('leaves the list it was given alone', () => {
    const habits = [sport([part('legs', [MONDAY])])];

    withSubHabitCompletion(habits, tick('legs', MONDAY, true));

    expect(habits[0]?.subHabits[0]?.completedDates).toEqual([]);
    expect(habits[0]?.completedDates).toEqual([]);
  });
});

describe('in the query cache', () => {
  const october: OverviewQuery = { from: '2026-10-01', to: '2026-10-31', asOf: '2026-10-07' };
  const oneDay: OverviewQuery = { from: MONDAY, to: MONDAY, asOf: '2026-10-07' };
  const november: OverviewQuery = { from: '2026-11-01', to: '2026-11-30', asOf: '2026-10-07' };

  function client() {
    const queryClient = new QueryClient();
    for (const query of [october, oneDay, november]) {
      queryClient.setQueryData(habitKeys.overview(query), [sport([part('legs', [MONDAY])])]);
    }
    return queryClient;
  }

  const read = (queryClient: QueryClient, query: OverviewQuery) =>
    queryClient.getQueryData<HabitOverview[]>(habitKeys.overview(query))?.[0];

  it('writes a part’s tick into every loaded overview that covers the day', () => {
    const queryClient = client();

    applySubHabitCompletion(queryClient, tick('legs', MONDAY, true));

    for (const query of [october, oneDay]) {
      expect(read(queryClient, query)?.subHabits[0]?.completedDates).toEqual([MONDAY]);
      expect(read(queryClient, query)?.completedDates).toEqual([MONDAY]);
    }
    expect(read(queryClient, november)?.subHabits[0]?.completedDates).toEqual([]);
  });

  it('writes the cascade of a habit’s own tick into the parts as well', () => {
    const queryClient = client();

    applyCompletion(queryClient, { habitId: 'sport', date: MONDAY, done: true });

    expect(read(queryClient, october)?.subHabits[0]?.completedDates).toEqual([MONDAY]);
  });
});
