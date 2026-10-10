import { differenceInCalendarDays, differenceInCalendarWeeks, getDaysInMonth } from 'date-fns';
import type { Recurrence, RecurrenceRequest } from '@/features/habits/recurrence';
import type { DayOfWeek } from '@/features/habits/weekdays';

export type { Recurrence } from '@/features/habits/recurrence';

const ALL_DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

/** "On these weekdays, every week" - what every habit was before the recurrence rules (B13). */
export function weeklyRecurrence(weekdays: readonly DayOfWeek[]): Recurrence {
  return {
    kind: 'weekly',
    weekdays: [...weekdays],
    interval: 1,
    anchor: null,
    occurrence: null,
    weekday: null,
    dayOfMonth: null,
  };
}

/**
 * What the server makes of a request: every fact present, the unused ones empty, a rhythm that
 * counts from a day given the start date when the request had none.
 */
export function recurrenceOf(request: RecurrenceRequest, startDate: string): Recurrence {
  switch (request.kind) {
    case 'everyNDays':
      return {
        ...weeklyRecurrence([]),
        kind: 'everyNDays',
        interval: request.interval ?? 2,
        anchor: request.anchor ?? startDate,
      };
    case 'monthlyOnWeekday':
      return {
        ...weeklyRecurrence([]),
        kind: 'monthlyOnWeekday',
        occurrence: request.occurrence ?? 'first',
        weekday: request.weekday ?? 1,
      };
    case 'monthlyOnDate':
      return {
        ...weeklyRecurrence([]),
        kind: 'monthlyOnDate',
        dayOfMonth: request.dayOfMonth ?? 1,
      };
    default: {
      const interval = request.interval ?? 1;
      return {
        ...weeklyRecurrence(request.weekdays ?? []),
        interval,
        anchor: interval > 1 ? (request.anchor ?? startDate) : null,
      };
    }
  }
}

/**
 * The weekdays a rule can fall on - the deprecated `schedule` of an answer: the chosen days, the
 * one weekday of "the last Saturday", all seven for the rules that do not depend on the weekday.
 */
export function weekdaysOf(rule: Recurrence): DayOfWeek[] {
  if (rule.kind === 'weekly') return [...rule.weekdays];
  if (rule.kind === 'monthlyOnWeekday' && rule.weekday !== null) return [rule.weekday];
  return [...ALL_DAYS];
}

/** `yyyy-MM-dd` as a local calendar day (a time zone cannot shift it). */
function dayOf(text: string): Date {
  const [year = 0, month = 1, day = 1] = text.split('-').map(Number);
  return new Date(year, month - 1, day);
}

const NTH = ['first', 'second', 'third', 'fourth'];

/**
 * Is the rule due on this day? The four rules of the backend's `HabitSchedule`, written out again
 * for the stand-in server - small enough to read at a glance, and checked in `recurrence.test.ts`
 * against dates that can be looked up in a calendar. Weeks start on Monday.
 */
export function isDue(rule: Recurrence, day: string): boolean {
  const date = dayOf(day);

  switch (rule.kind) {
    case 'weekly': {
      if (!rule.weekdays.includes(date.getDay() as DayOfWeek)) return false;
      if (rule.interval <= 1 || rule.anchor === null) return true;
      const weeks = differenceInCalendarWeeks(date, dayOf(rule.anchor), { weekStartsOn: 1 });
      return weeks % rule.interval === 0;
    }
    case 'everyNDays': {
      if (rule.anchor === null) return false;
      return differenceInCalendarDays(date, dayOf(rule.anchor)) % rule.interval === 0;
    }
    case 'monthlyOnWeekday': {
      if (date.getDay() !== rule.weekday) return false;
      if (rule.occurrence === 'last') return date.getDate() + 7 > getDaysInMonth(date);
      return Math.ceil(date.getDate() / 7) === NTH.indexOf(rule.occurrence ?? '') + 1;
    }
    case 'monthlyOnDate': {
      // A month without that date uses its last day.
      return date.getDate() === Math.min(rule.dayOfMonth ?? 1, getDaysInMonth(date));
    }
  }
}
