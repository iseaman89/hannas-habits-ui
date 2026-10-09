import { describe, expect, it } from 'vitest';
import { toApiDate } from '@/shared/lib/dates';
import { daysOfMonth, monthRange, parseMonthParam, toMonthParam } from './months';

describe('the month in the address', () => {
  it('is written as yyyy-MM', () => {
    expect(toMonthParam(new Date(2026, 9, 31, 23, 30))).toBe('2026-10');
    expect(toMonthParam(new Date(2026, 0, 1, 0, 30))).toBe('2026-01');
  });

  it('is read back as the first day of that month', () => {
    const month = parseMonthParam('2026-10');
    expect(month && toApiDate(month)).toBe('2026-10-01');
  });

  it.each([null, '', '2026', '2026-1', '2026-13', '2026-00', '2026-10-05', 'october', ' 2026-10'])(
    'reads %j as "no month" so the screen falls back to the current one',
    (value) => {
      expect(parseMonthParam(value)).toBeNull();
    },
  );
});

describe('daysOfMonth', () => {
  it.each([
    [2026, 1, 28],
    [2028, 1, 29], // leap year
    [2026, 3, 30],
    [2026, 9, 31],
  ])('year %i month index %i has %i days', (year, monthIndex, count) => {
    expect(daysOfMonth(new Date(year, monthIndex, 15))).toHaveLength(count);
  });

  it('runs from the first to the last day in order', () => {
    const days = daysOfMonth(new Date(2026, 9, 15)).map(toApiDate);
    expect(days[0]).toBe('2026-10-01');
    expect(days[30]).toBe('2026-10-31');
    expect(days).toEqual([...days].sort());
  });
});

describe('monthRange', () => {
  it('is the first and the last day, whatever day of the month is given', () => {
    expect(monthRange(new Date(2026, 9, 17, 23, 59))).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    });
    expect(monthRange(new Date(2028, 1, 1))).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });
});
