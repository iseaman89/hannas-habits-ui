import { describe, expect, it } from 'vitest';
import {
  ordinal,
  recurrenceLabel,
  recurrenceSummary,
  sameRecurrence,
  toRecurrenceRequest,
  toRecurrenceValues,
  type Recurrence,
} from './recurrence';
import { DEFAULT_RECURRENCE, recurrenceSchema, type RecurrenceValues } from './recurrenceSchema';

const rule = (changes: Partial<RecurrenceValues>): RecurrenceValues => ({
  ...DEFAULT_RECURRENCE,
  ...changes,
});

/** A rule as the server answers with it: every fact there, the unused ones empty. */
const answer = (changes: Partial<Recurrence>): Recurrence => ({
  kind: 'weekly',
  weekdays: [],
  interval: 1,
  anchor: null,
  occurrence: null,
  weekday: null,
  dayOfMonth: null,
  ...changes,
});

describe('ordinal', () => {
  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [10, '10th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
    [22, '22nd'],
    [23, '23rd'],
    [30, '30th'],
    [31, '31st'],
    [52, '52nd'],
    [101, '101st'],
    [111, '111th'],
    [365, '365th'],
  ])('%i is %s', (n, text) => {
    expect(ordinal(n)).toBe(text);
  });
});

describe('recurrenceLabel (under the habit)', () => {
  it.each<[string, Partial<RecurrenceValues>, string]>([
    ['every day', {}, 'Every day'],
    ['weekdays', { weekdays: [1, 2, 3, 4, 5] }, 'Weekdays'],
    ['weekends', { weekdays: [0, 6] }, 'Weekends'],
    ['some days, in the order of the week', { weekdays: [5, 1, 3] }, 'Mon · Wed · Fri'],
    [
      'every 2nd week on two days',
      { weekdays: [4, 1], everyWeeks: 2 },
      'Every 2nd week on Mon and Thu',
    ],
    [
      'every 3rd week on three',
      { weekdays: [1, 3, 5], everyWeeks: 3 },
      'Every 3rd week on Mon, Wed and Fri',
    ],
    ['every 2nd week on one day', { weekdays: [6], everyWeeks: 2 }, 'Every 2nd week on Sat'],
    [
      'every 2nd week on weekdays',
      { weekdays: [1, 2, 3, 4, 5], everyWeeks: 2 },
      'Every 2nd week on weekdays',
    ],
    ['every 2nd week on every day', { everyWeeks: 2 }, 'Every 2nd week on all days'],
    ['every 11th week', { weekdays: [1], everyWeeks: 11 }, 'Every 11th week on Mon'],
    ['every 3rd day', { kind: 'everyNDays', everyDays: 3 }, 'Every 3rd day'],
    ['every 21st day', { kind: 'everyNDays', everyDays: 21 }, 'Every 21st day'],
    [
      'the first Monday',
      { kind: 'monthlyOnWeekday', occurrence: 'first', weekday: 1 },
      'First Monday of the month',
    ],
    [
      'the last Saturday',
      { kind: 'monthlyOnWeekday', occurrence: 'last', weekday: 6 },
      'Last Saturday of the month',
    ],
    ['the 15th', { kind: 'monthlyOnDate', dayOfMonth: 15 }, 'On the 15th of the month'],
    ['the 2nd', { kind: 'monthlyOnDate', dayOfMonth: 2 }, 'On the 2nd of the month'],
    ['the last day', { kind: 'monthlyOnDate', dayOfMonth: 31 }, 'Last day of the month'],
  ])('%s', (_name, changes, label) => {
    expect(recurrenceLabel(rule(changes))).toBe(label);
  });

  it('names the weeks for an empty number as "every week"', () => {
    expect(recurrenceLabel(rule({ weekdays: [1], everyWeeks: null }))).toBe('Mon');
  });
});

describe('recurrenceSummary (in the form)', () => {
  const START = '2026-10-07'; // a Wednesday; its week starts on Monday 5 October

  it.each<[string, Partial<RecurrenceValues>, string]>([
    ['every day', {}, 'Every day'],
    ['a few days', { weekdays: [1, 3] }, 'Every week on Mon and Wed'],
    ['weekdays', { weekdays: [1, 2, 3, 4, 5] }, 'Every week on weekdays'],
    [
      'every other week from the start date’s week',
      { weekdays: [1, 4], everyWeeks: 2 },
      'Every 2nd week on Mon and Thu, starting with the week of Mon 5 Oct 2026',
    ],
    [
      'every other week from a day of its own',
      { weekdays: [1], everyWeeks: 2, anchor: '2026-11-15' }, // a Sunday: the week of Mon 9 Nov
      'Every 2nd week on Mon, starting with the week of Mon 9 Nov 2026',
    ],
    [
      'every 3rd day from the start date',
      { kind: 'everyNDays', everyDays: 3 },
      'Every 3rd day, starting Wed 7 Oct 2026',
    ],
    [
      'every 3rd day from a day of its own',
      { kind: 'everyNDays', everyDays: 3, anchor: '2026-09-20' },
      'Every 3rd day, starting Sun 20 Sep 2026',
    ],
    [
      'a weekday of the month',
      { kind: 'monthlyOnWeekday', occurrence: 'second', weekday: 2 },
      'Second Tuesday of the month',
    ],
    ['a date', { kind: 'monthlyOnDate', dayOfMonth: 15 }, 'On the 15th of the month'],
    [
      'a date a short month does not have',
      { kind: 'monthlyOnDate', dayOfMonth: 30 },
      'On the 30th of the month (the last day of a shorter month)',
    ],
    ['the last day', { kind: 'monthlyOnDate', dayOfMonth: 31 }, 'Last day of the month'],
  ])('%s', (_name, changes, text) => {
    expect(recurrenceSummary(rule(changes), START)).toBe(text);
  });

  it('leaves the day out while there is none to name', () => {
    expect(recurrenceSummary(rule({ kind: 'everyNDays', everyDays: 3 }), '')).toBe('Every 3rd day');
  });
});

describe('toRecurrenceRequest', () => {
  it.each<[string, Partial<RecurrenceValues>, object]>([
    ['every week', { weekdays: [3, 1] }, { kind: 'weekly', weekdays: [1, 3], interval: 1 }],
    [
      'every week drops a day to count from: there is none to count',
      { weekdays: [1], anchor: '2026-10-05' },
      { kind: 'weekly', weekdays: [1], interval: 1 },
    ],
    [
      'every other week, counted from the start date',
      { weekdays: [1], everyWeeks: 2 },
      { kind: 'weekly', weekdays: [1], interval: 2 },
    ],
    [
      'every other week, counted from a day',
      { weekdays: [1], everyWeeks: 2, anchor: '2026-10-05' },
      { kind: 'weekly', weekdays: [1], interval: 2, anchor: '2026-10-05' },
    ],
    [
      'every 3rd day',
      { kind: 'everyNDays', everyDays: 3, weekdays: [], everyWeeks: 9 },
      { kind: 'everyNDays', interval: 3 },
    ],
    [
      'every 3rd day from a day',
      { kind: 'everyNDays', everyDays: 3, anchor: '2026-10-01' },
      { kind: 'everyNDays', interval: 3, anchor: '2026-10-01' },
    ],
    [
      'a weekday of the month',
      { kind: 'monthlyOnWeekday', occurrence: 'last', weekday: 6, anchor: '2026-10-01' },
      { kind: 'monthlyOnWeekday', occurrence: 'last', weekday: 6 },
    ],
    [
      'a date of the month',
      { kind: 'monthlyOnDate', dayOfMonth: 15, everyDays: 9 },
      { kind: 'monthlyOnDate', dayOfMonth: 15 },
    ],
  ])('%s', (_name, changes, request) => {
    expect(toRecurrenceRequest(rule(changes))).toEqual(request);
  });
});

describe('toRecurrenceValues', () => {
  it('reads every kind back into the facts the form shows', () => {
    expect(
      toRecurrenceValues(answer({ weekdays: [5, 1], interval: 2, anchor: '2026-10-05' })),
    ).toEqual(rule({ weekdays: [1, 5], everyWeeks: 2, anchor: '2026-10-05' }));
    expect(
      toRecurrenceValues(answer({ kind: 'everyNDays', interval: 4, anchor: '2026-09-20' })),
    ).toEqual(rule({ kind: 'everyNDays', everyDays: 4, anchor: '2026-09-20' }));
    expect(
      toRecurrenceValues(answer({ kind: 'monthlyOnWeekday', occurrence: 'last', weekday: 6 })),
    ).toEqual(rule({ kind: 'monthlyOnWeekday', occurrence: 'last', weekday: 6 }));
    expect(toRecurrenceValues(answer({ kind: 'monthlyOnDate', dayOfMonth: 31 }))).toEqual(
      rule({ kind: 'monthlyOnDate', dayOfMonth: 31 }),
    );
  });

  it('sends back what it was given: a saved rule and its request are the same rule', () => {
    const saved = answer({ kind: 'everyNDays', interval: 4, anchor: '2026-09-20' });

    expect(toRecurrenceRequest(toRecurrenceValues(saved))).toEqual({
      kind: 'everyNDays',
      interval: 4,
      anchor: '2026-09-20',
    });
  });

  it('gives the kinds that are not saved their defaults, not the answer’s empty lists', () => {
    const values = toRecurrenceValues(answer({ kind: 'monthlyOnDate', dayOfMonth: 5 }));

    // `weekdays: []` would make "weekly" unusable when the person switches to it.
    expect(values.weekdays).toEqual([1, 2, 3, 4, 5, 6, 0]); // every day, Monday first
    expect(values.everyWeeks).toBe(1);
    expect(values.everyDays).toBe(2);
  });
});

describe('sameRecurrence', () => {
  it('is about what would be sent, not about the facts of kinds that are not chosen', () => {
    const a = rule({ kind: 'monthlyOnDate', dayOfMonth: 5, everyDays: 3 });
    const b = rule({ kind: 'monthlyOnDate', dayOfMonth: 5, everyDays: 9, weekdays: [2] });

    expect(sameRecurrence(a, b)).toBe(true);
  });

  it('sees every fact of the chosen kind', () => {
    const base = rule({ weekdays: [1, 3], everyWeeks: 2, anchor: '2026-10-05' });

    expect(sameRecurrence(base, rule({ ...base, weekdays: [1] }))).toBe(false);
    expect(sameRecurrence(base, rule({ ...base, everyWeeks: 3 }))).toBe(false);
    expect(sameRecurrence(base, rule({ ...base, anchor: '2026-10-12' }))).toBe(false);
    expect(sameRecurrence(base, rule({ ...base, kind: 'everyNDays' }))).toBe(false);
  });
});

describe('recurrenceSchema', () => {
  const valid = (changes: Partial<RecurrenceValues>) =>
    recurrenceSchema.safeParse(rule(changes)).success;

  it('accepts the default and the edges of every limit', () => {
    expect(valid({})).toBe(true);
    expect(valid({ everyWeeks: 1 })).toBe(true);
    expect(valid({ everyWeeks: 52 })).toBe(true);
    expect(valid({ kind: 'everyNDays', everyDays: 2 })).toBe(true);
    expect(valid({ kind: 'everyNDays', everyDays: 365 })).toBe(true);
    expect(valid({ kind: 'monthlyOnDate', dayOfMonth: 1 })).toBe(true);
    expect(valid({ kind: 'monthlyOnDate', dayOfMonth: 31 })).toBe(true);
    expect(valid({ kind: 'weekly', everyWeeks: 2, anchor: '2000-01-01' })).toBe(true);
    expect(valid({ kind: 'weekly', everyWeeks: 2, anchor: '2100-12-31' })).toBe(true);
  });

  it.each<[string, Partial<RecurrenceValues>]>([
    ['no weekday', { weekdays: [] }],
    ['0 weeks', { everyWeeks: 0 }],
    ['53 weeks', { everyWeeks: 53 }],
    ['an empty number of weeks', { everyWeeks: null }],
    ['1 day', { kind: 'everyNDays', everyDays: 1 }],
    ['366 days', { kind: 'everyNDays', everyDays: 366 }],
    ['2.5 days', { kind: 'everyNDays', everyDays: 2.5 }],
    ['day 0 of the month', { kind: 'monthlyOnDate', dayOfMonth: 0 }],
    ['day 32 of the month', { kind: 'monthlyOnDate', dayOfMonth: 32 }],
    ['no day of the month', { kind: 'monthlyOnDate', dayOfMonth: null }],
    ['an anchor before 2000', { kind: 'everyNDays', everyDays: 3, anchor: '1999-12-31' }],
    ['an anchor after 2100', { kind: 'everyNDays', everyDays: 3, anchor: '2101-01-01' }],
    ['an anchor that is not a day', { kind: 'everyNDays', everyDays: 3, anchor: '2026-02-30' }],
  ])('refuses %s', (_name, changes) => {
    expect(valid(changes)).toBe(false);
  });

  it('only looks at the facts of the chosen kind', () => {
    expect(
      valid({
        kind: 'monthlyOnWeekday',
        weekdays: [],
        everyWeeks: 0,
        everyDays: null,
        dayOfMonth: 99,
      }),
    ).toBe(true);
    // A day to count from means nothing for "every week", so a bad one is not a problem there.
    expect(valid({ everyWeeks: 1, anchor: 'garbage' })).toBe(true);
    expect(valid({ everyWeeks: 2, anchor: 'garbage' })).toBe(false);
  });

  it('names the fact that is wrong', () => {
    const result = recurrenceSchema.safeParse(rule({ kind: 'everyNDays', everyDays: 1 }));

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([['everyDays']]);
  });
});
