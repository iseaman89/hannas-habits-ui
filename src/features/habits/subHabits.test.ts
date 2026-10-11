import { describe, expect, it } from 'vitest';
import { recurrenceOf, weeklyRecurrence } from '@/test/recurrence';
import {
  dueSubHabits,
  habitWeekdays,
  partsLabel,
  strandedWeekdays,
  subHabitProgress,
  type SubHabit,
} from './subHabits';

describe('habitWeekdays - the days a part may be planned on', () => {
  it('is the chosen days of a weekly rule, Monday first', () => {
    expect(habitWeekdays(weeklyRecurrence([0, 3, 1]))).toEqual([1, 3, 0]);
  });

  it('keeps the chosen days of a rule that repeats every few weeks', () => {
    const rule = { ...weeklyRecurrence([2, 4]), interval: 2, anchor: '2026-10-05' };

    expect(habitWeekdays(rule)).toEqual([2, 4]);
  });

  it('is the one weekday of "the last Saturday of the month"', () => {
    const rule = recurrenceOf(
      { kind: 'monthlyOnWeekday', occurrence: 'last', weekday: 6 },
      '2026-10-01',
    );

    expect(habitWeekdays(rule)).toEqual([6]);
  });

  it.each([
    ['every few days', { kind: 'everyNDays', interval: 3 } as const],
    ['a date of the month', { kind: 'monthlyOnDate', dayOfMonth: 15 } as const],
    ['times a week', { kind: 'timesPerWeek', times: 3 } as const],
    ['times a month', { kind: 'timesPerMonth', times: 8 } as const],
  ])('is every weekday for a rule with no weekday of its own: %s', (_name, request) => {
    expect(habitWeekdays(recurrenceOf(request, '2026-10-01'))).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });
});

const legs: SubHabit = {
  id: 's-legs',
  title: 'Legs',
  weekdays: [1],
  scheduledDates: ['2026-10-05', '2026-10-12'],
  completedDates: ['2026-10-05'],
};
const arms: SubHabit = {
  id: 's-arms',
  title: 'Arms',
  weekdays: [1, 3],
  scheduledDates: ['2026-10-05', '2026-10-07', '2026-10-12'],
  completedDates: [],
};

describe('dueSubHabits', () => {
  it('lists the parts whose due days (the server says them) include the day, in their order', () => {
    expect(dueSubHabits({ subHabits: [legs, arms] }, '2026-10-05')).toEqual([legs, arms]);
    expect(dueSubHabits({ subHabits: [legs, arms] }, '2026-10-07')).toEqual([arms]);
  });

  it('is empty on a day nothing is due, and for a habit without parts', () => {
    expect(dueSubHabits({ subHabits: [legs, arms] }, '2026-10-06')).toEqual([]);
    expect(dueSubHabits({ subHabits: [] }, '2026-10-05')).toEqual([]);
  });
});

describe('subHabitProgress', () => {
  it('counts the due parts and the ones that are done on the day', () => {
    expect(subHabitProgress({ subHabits: [legs, arms] }, '2026-10-05')).toEqual({
      due: 2,
      done: 1,
    });
    expect(subHabitProgress({ subHabits: [legs, arms] }, '2026-10-07')).toEqual({
      due: 1,
      done: 0,
    });
  });

  it('is null when no part is due: the day is the habit’s own business', () => {
    expect(subHabitProgress({ subHabits: [legs, arms] }, '2026-10-06')).toBeNull();
    expect(subHabitProgress({ subHabits: [] }, '2026-10-05')).toBeNull();
  });

  it('does not count a tick on a day the part is not due on', () => {
    const stray = { ...arms, completedDates: ['2026-10-06'] };

    expect(subHabitProgress({ subHabits: [stray] }, '2026-10-06')).toBeNull();
  });
});

describe('partsLabel', () => {
  it('says one part and several parts', () => {
    expect(partsLabel(1)).toBe('1 part');
    expect(partsLabel(2)).toBe('2 parts');
    expect(partsLabel(10)).toBe('10 parts');
  });
});

describe('strandedWeekdays', () => {
  it('lists the part’s days that the habit does not have (any more), Monday first', () => {
    expect(strandedWeekdays({ weekdays: [0, 5, 1, 3] }, [1, 3])).toEqual([5, 0]);
  });

  it('is empty while every day of the part is a day of the habit', () => {
    expect(strandedWeekdays({ weekdays: [1, 3] }, [1, 2, 3])).toEqual([]);
  });
});
