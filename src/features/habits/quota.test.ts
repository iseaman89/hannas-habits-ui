import { describe, expect, it } from 'vitest';
import { weeklyRecurrence } from '@/test/recurrence';
import type { HabitOverview } from './habitsGateway';
import { isQuota, quotaProgressText, streakUnit } from './quota';
import type { Recurrence } from './recurrence';

const rule = (changes: Partial<Recurrence>): Recurrence => ({
  ...weeklyRecurrence([]),
  ...changes,
});

const perWeek = rule({ kind: 'timesPerWeek', times: 3 });
const perMonth = rule({ kind: 'timesPerMonth', times: 8 });

const habit = (
  recurrence: Recurrence,
  quotaPeriods: HabitOverview['quotaPeriods'],
): Pick<HabitOverview, 'recurrence' | 'quotaPeriods'> => ({ recurrence, quotaPeriods });

describe('isQuota / streakUnit', () => {
  it.each<[string, Recurrence, boolean, string]>([
    ['weekdays', weeklyRecurrence([1, 3]), false, 'day'],
    ['every N days', rule({ kind: 'everyNDays', interval: 3 }), false, 'day'],
    ['a weekday of the month', rule({ kind: 'monthlyOnWeekday' }), false, 'day'],
    ['a date of the month', rule({ kind: 'monthlyOnDate', dayOfMonth: 1 }), false, 'day'],
    ['times a week', perWeek, true, 'week'],
    ['times a month', perMonth, true, 'month'],
  ])('%s', (_name, recurrence, quota, unit) => {
    expect(isQuota(recurrence)).toBe(quota);
    expect(streakUnit(recurrence)).toBe(unit);
  });
});

describe('quotaProgressText', () => {
  const week = { from: '2026-10-05', to: '2026-10-11', done: 2 };

  it('says how far the week of today has come', () => {
    expect(quotaProgressText(habit(perWeek, [week]), '2026-10-08', '2026-10-08')).toBe(
      '2 of 3 this week',
    );
  });

  it('says it for a month too', () => {
    const month = { from: '2026-10-01', to: '2026-10-31', done: 5 };

    expect(quotaProgressText(habit(perMonth, [month]), '2026-10-08', '2026-10-08')).toBe(
      '5 of 8 this month',
    );
  });

  it('finds the period of the day among several', () => {
    const periods = [
      { from: '2026-09-28', to: '2026-10-04', done: 3 },
      week,
      { from: '2026-10-12', to: '2026-10-18', done: 0 },
    ];

    expect(quotaProgressText(habit(perWeek, periods), '2026-10-04', '2026-10-08')).toBe(
      '3 of 3 in that week',
    );
    expect(quotaProgressText(habit(perWeek, periods), '2026-10-12', '2026-10-08')).toBe(
      '0 of 3 in that week',
    );
  });

  it('counts the first and the last day of a period as inside it', () => {
    expect(quotaProgressText(habit(perWeek, [week]), '2026-10-05', '2026-10-05')).toBe(
      '2 of 3 this week',
    );
    expect(quotaProgressText(habit(perWeek, [week]), '2026-10-11', '2026-10-11')).toBe(
      '2 of 3 this week',
    );
  });

  it('shows a week that went past the number as it is', () => {
    expect(
      quotaProgressText(habit(perWeek, [{ ...week, done: 5 }]), '2026-10-08', '2026-10-08'),
    ).toBe('5 of 3 this week');
  });

  it('has nothing for a day whose period was not asked for', () => {
    expect(quotaProgressText(habit(perWeek, [week]), '2026-11-02', '2026-10-08')).toBeNull();
    expect(quotaProgressText(habit(perWeek, []), '2026-10-08', '2026-10-08')).toBeNull();
  });

  it('has nothing for a rule that is no quota', () => {
    expect(
      quotaProgressText(habit(weeklyRecurrence([1]), [week]), '2026-10-08', '2026-10-08'),
    ).toBeNull();
  });
});
