import { eachDayOfInterval, format, parseISO } from 'date-fns';
import { describe, expect, it } from 'vitest';
import {
  isDue,
  quotaPeriodsOf,
  recurrenceOf,
  weeklyRecurrence,
  type Recurrence,
} from './recurrence';

// The stand-in server's rules are only worth something if they agree with a calendar. October
// 2026 starts on a Thursday, November on a Sunday, February 2028 has 29 days.
const rule = (facts: Partial<Recurrence>): Recurrence => ({ ...weeklyRecurrence([]), ...facts });

function dueDays(recurrence: Recurrence, from: string, to: string): string[] {
  return eachDayOfInterval({ start: parseISO(from), end: parseISO(to) })
    .map((day) => format(day, 'yyyy-MM-dd'))
    .filter((day) => isDue(recurrence, day));
}

describe('isDue', () => {
  it('weekly: the chosen weekdays, every week', () => {
    expect(dueDays(weeklyRecurrence([1, 4]), '2026-10-05', '2026-10-18')).toEqual([
      '2026-10-05',
      '2026-10-08',
      '2026-10-12',
      '2026-10-15',
    ]);
  });

  it('weekly every other week: weeks start on Monday and count from the anchor’s week', () => {
    // Wednesday 7 October lies in the week of Monday 5 October: that week is the first one.
    const everyOther = rule({ weekdays: [1, 0], interval: 2, anchor: '2026-10-07' });

    expect(dueDays(everyOther, '2026-09-14', '2026-10-31')).toEqual([
      // the week of 14 Sep is three weeks before the first one: not due
      '2026-09-21', // two weeks before
      '2026-09-27', // Sunday 27 Sep ends the week of Monday 21 Sep
      '2026-10-05', // the anchor's own week
      '2026-10-11', // Sunday 11 Oct ends the week of Monday 5 Oct
      '2026-10-19',
      '2026-10-25',
    ]);
  });

  it('every N days: the anchor is due, and so is every N-th day on both sides of it', () => {
    const everyThird = rule({ kind: 'everyNDays', interval: 3, anchor: '2026-10-01' });

    expect(dueDays(everyThird, '2026-09-25', '2026-10-13')).toEqual([
      '2026-09-25',
      '2026-09-28',
      '2026-10-01',
      '2026-10-04',
      '2026-10-07',
      '2026-10-10',
      '2026-10-13',
    ]);
  });

  it.each([
    ['first', '2026-10-03'],
    ['second', '2026-10-10'],
    ['third', '2026-10-17'],
    ['fourth', '2026-10-24'],
    ['last', '2026-10-31'], // the fifth, and the last
  ] as const)('monthly on a weekday: the %s Saturday of October 2026 is %s', (occurrence, day) => {
    const monthly = rule({ kind: 'monthlyOnWeekday', occurrence, weekday: 6 });

    expect(dueDays(monthly, '2026-10-01', '2026-10-31')).toEqual([day]);
  });

  it('monthly on a weekday: "last" is the fourth one in a month with only four', () => {
    const lastSaturday = rule({ kind: 'monthlyOnWeekday', occurrence: 'last', weekday: 6 });

    // November 2026: Saturdays are the 7th, 14th, 21st and 28th.
    expect(dueDays(lastSaturday, '2026-11-01', '2026-11-30')).toEqual(['2026-11-28']);
  });

  it('monthly on a weekday: a fifth Monday is "last" and not "fourth"', () => {
    // November 2026 has five Mondays: 2, 9, 16, 23, 30.
    const fourth = rule({ kind: 'monthlyOnWeekday', occurrence: 'fourth', weekday: 1 });
    const last = rule({ kind: 'monthlyOnWeekday', occurrence: 'last', weekday: 1 });

    expect(dueDays(fourth, '2026-11-01', '2026-11-30')).toEqual(['2026-11-23']);
    expect(dueDays(last, '2026-11-01', '2026-11-30')).toEqual(['2026-11-30']);
  });

  it.each([
    [15, '2026-10-01', '2026-10-31', ['2026-10-15']],
    // A month without the date uses its last day: April has 30, February 2026 28, 2028 29.
    [31, '2026-04-01', '2026-04-30', ['2026-04-30']],
    [31, '2026-02-01', '2026-02-28', ['2026-02-28']],
    [30, '2028-02-01', '2028-02-29', ['2028-02-29']],
    [31, '2026-10-01', '2026-10-31', ['2026-10-31']],
  ])('monthly on the %ith: %s to %s', (dayOfMonth, from, to, expected) => {
    expect(dueDays(rule({ kind: 'monthlyOnDate', dayOfMonth }), from, to)).toEqual(expected);
  });
});

describe('a quota', () => {
  const perWeek = rule({ kind: 'timesPerWeek', times: 3 });
  const perMonth = rule({ kind: 'timesPerMonth', times: 2 });
  const marks = (...days: string[]) => new Set(days);

  it('has no due day: every day can be ticked', () => {
    expect(dueDays(perWeek, '2026-10-01', '2026-10-04')).toEqual([
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(dueDays(perMonth, '2026-10-30', '2026-11-01')).toHaveLength(3);
  });

  it('is made from a request with its count', () => {
    expect(recurrenceOf({ kind: 'timesPerWeek', times: 4 }, '2026-10-01')).toMatchObject({
      kind: 'timesPerWeek',
      times: 4,
      weekdays: [],
      anchor: null,
    });
    expect(recurrenceOf({ kind: 'timesPerMonth', times: 9 }, '2026-10-01').times).toBe(9);
  });

  it('has the weeks of a calendar, Monday to Sunday, whole - also where they leave the range', () => {
    // October 2026 starts on a Thursday: the first week began on Monday 28 September.
    expect(
      quotaPeriodsOf(
        perWeek,
        '2026-09-01',
        marks('2026-09-29', '2026-10-05'),
        '2026-10-01',
        '2026-10-31',
      ),
    ).toEqual([
      { from: '2026-09-28', to: '2026-10-04', done: 1 },
      { from: '2026-10-05', to: '2026-10-11', done: 1 },
      { from: '2026-10-12', to: '2026-10-18', done: 0 },
      { from: '2026-10-19', to: '2026-10-25', done: 0 },
      { from: '2026-10-26', to: '2026-11-01', done: 0 },
    ]);
  });

  it('does not count days before the start, and leaves out a period that ended before it', () => {
    const periods = quotaPeriodsOf(
      perWeek,
      '2026-10-08',
      marks('2026-10-05', '2026-10-08'),
      '2026-10-01',
      '2026-10-31',
    );

    expect(periods[0]).toEqual({ from: '2026-10-05', to: '2026-10-11', done: 1 });
    expect(periods).toHaveLength(4);
  });

  it('has the calendar months of the range', () => {
    expect(
      quotaPeriodsOf(
        perMonth,
        '2026-01-01',
        marks('2026-09-20', '2026-10-02'),
        '2026-09-15',
        '2026-10-15',
      ),
    ).toEqual([
      { from: '2026-09-01', to: '2026-09-30', done: 1 },
      { from: '2026-10-01', to: '2026-10-31', done: 1 },
    ]);
  });

  it('has none for a rule with due days', () => {
    expect(
      quotaPeriodsOf(
        weeklyRecurrence([1]),
        '2026-01-01',
        marks('2026-10-05'),
        '2026-10-01',
        '2026-10-31',
      ),
    ).toEqual([]);
  });
});

describe('recurrenceOf', () => {
  it('counts a rhythm without a day of its own from the start date', () => {
    expect(recurrenceOf({ kind: 'everyNDays', interval: 3 }, '2026-10-07')).toMatchObject({
      kind: 'everyNDays',
      interval: 3,
      anchor: '2026-10-07',
    });
    expect(recurrenceOf({ kind: 'weekly', weekdays: [1], interval: 2 }, '2026-10-07').anchor).toBe(
      '2026-10-07',
    );
  });

  it('gives "every week" no anchor, even when one was sent', () => {
    expect(
      recurrenceOf(
        { kind: 'weekly', weekdays: [1], interval: 1, anchor: '2026-10-07' },
        '2026-10-01',
      ).anchor,
    ).toBeNull();
  });

  it('keeps the anchor that was sent', () => {
    expect(
      recurrenceOf({ kind: 'everyNDays', interval: 3, anchor: '2026-09-01' }, '2026-10-07').anchor,
    ).toBe('2026-09-01');
  });
});
