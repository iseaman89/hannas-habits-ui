import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { weeklyRecurrence } from '@/test/recurrence';
import { habitKeys } from './habitQueries';
import type { HabitOverview, OverviewQuery } from './habitsGateway';
import { applySubHabitNote, withSubHabitNote } from './overviewCache';
import type { SubHabit } from './subHabits';

const MONDAY = '2026-10-05';
const WEDNESDAY = '2026-10-07';
const NEXT_MONDAY = '2026-10-12';

function part(id: string, notes: SubHabit['notes'] = [], completedDates: string[] = []): SubHabit {
  return {
    id,
    title: id,
    weekdays: [1],
    scheduledDates: [MONDAY, NEXT_MONDAY],
    completedDates,
    notes,
  };
}

function habit(id: string, subHabits: SubHabit[], completedDates: string[] = []): HabitOverview {
  return {
    id,
    title: id,
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

const write = (subHabitId: string, date: string, text: string | null, habitId = 'sport') => ({
  habitId,
  subHabitId,
  date,
  text,
});

describe('withSubHabitNote', () => {
  it('puts a note on the part and day', () => {
    const [changed] = withSubHabitNote(
      [habit('sport', [part('legs')])],
      write('legs', MONDAY, '3 x 10'),
    );

    expect(changed?.subHabits[0]?.notes).toEqual([{ date: MONDAY, text: '3 x 10' }]);
  });

  it('replaces the text of the day: one note per day', () => {
    const before = [habit('sport', [part('legs', [{ date: MONDAY, text: 'first' }])])];

    const [changed] = withSubHabitNote(before, write('legs', MONDAY, 'second'));

    expect(changed?.subHabits[0]?.notes).toEqual([{ date: MONDAY, text: 'second' }]);
  });

  it('keeps the notes oldest first', () => {
    const before = [habit('sport', [part('legs', [{ date: NEXT_MONDAY, text: 'later' }])])];

    const [changed] = withSubHabitNote(before, write('legs', MONDAY, 'earlier'));

    expect(changed?.subHabits[0]?.notes.map((note) => note.date)).toEqual([MONDAY, NEXT_MONDAY]);
  });

  it('takes the note of the day away for `null` and leaves the other days', () => {
    const before = [
      habit('sport', [
        part('legs', [
          { date: MONDAY, text: 'gone' },
          { date: NEXT_MONDAY, text: 'stays' },
        ]),
      ]),
    ];

    const [changed] = withSubHabitNote(before, write('legs', MONDAY, null));

    expect(changed?.subHabits[0]?.notes).toEqual([{ date: NEXT_MONDAY, text: 'stays' }]);
  });

  it('is fine with taking away a note that is not there', () => {
    const before = [habit('sport', [part('legs')])];

    const [changed] = withSubHabitNote(before, write('legs', MONDAY, null));

    expect(changed?.subHabits[0]?.notes).toEqual([]);
  });

  it('touches only the part of the habit it names', () => {
    const before = [
      habit('sport', [part('legs'), part('arms')]),
      habit('read', [part('legs')], []),
    ];

    const changed = withSubHabitNote(before, write('legs', MONDAY, 'x'));

    expect(changed[0]?.subHabits[0]?.notes).toHaveLength(1);
    expect(changed[0]?.subHabits[1]).toBe(before[0]?.subHabits[1]);
    expect(changed[1]).toBe(before[1]);
  });

  it('leaves the ticks and the habit’s day alone: a note is independent of them', () => {
    const before = [habit('sport', [part('legs', [], [MONDAY])], [MONDAY])];

    const [changed] = withSubHabitNote(before, write('legs', MONDAY, 'x'));

    expect(changed?.completedDates).toEqual([MONDAY]);
    expect(changed?.subHabits[0]?.completedDates).toEqual([MONDAY]);
    expect(changed?.currentStreak).toBe(2);
  });

  it('does not change what it was given', () => {
    const before = [habit('sport', [part('legs', [{ date: MONDAY, text: 'first' }])])];
    const snapshot = JSON.stringify(before);

    withSubHabitNote(before, write('legs', MONDAY, 'second'));
    withSubHabitNote(before, write('legs', NEXT_MONDAY, null));

    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('applySubHabitNote', () => {
  const october: OverviewQuery = { from: '2026-10-01', to: '2026-10-31', asOf: '2026-10-07' };
  const november: OverviewQuery = { from: '2026-11-01', to: '2026-11-30', asOf: '2026-10-07' };

  it('writes into the overviews that cover the day and into no other', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(habitKeys.overview(october), [habit('sport', [part('legs')])]);
    queryClient.setQueryData(habitKeys.overview(november), [habit('sport', [part('legs')])]);

    applySubHabitNote(queryClient, write('legs', MONDAY, 'x'));

    const inOctober = queryClient.getQueryData<HabitOverview[]>(habitKeys.overview(october));
    const inNovember = queryClient.getQueryData<HabitOverview[]>(habitKeys.overview(november));
    expect(inOctober?.[0]?.subHabits[0]?.notes).toEqual([{ date: MONDAY, text: 'x' }]);
    expect(inNovember?.[0]?.subHabits[0]?.notes).toEqual([]);
  });
});
