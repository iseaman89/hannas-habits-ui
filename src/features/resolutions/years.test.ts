import { describe, expect, it } from 'vitest';
import { FIRST_YEAR, LAST_YEAR, parseYearParam } from './years';

describe('the year of the resolutions screen', () => {
  it('has the server’s bounds', () => {
    expect(FIRST_YEAR).toBe(2000); // Resolution.MinYear
    expect(LAST_YEAR).toBe(2100); // Resolution.MaxYear
  });

  it.each([
    ['2000', 2000],
    ['2026', 2026],
    ['2027', 2027], // unlike the calendar, a year to come is fine
    ['2100', 2100],
  ])('reads %s', (value, year) => {
    expect(parseYearParam(value)).toBe(year);
  });

  it.each([[null], [''], ['1999'], ['2101'], ['nonsense'], ['26'], [' 2026'], ['2026-10']])(
    'falls back for %j',
    (value) => {
      expect(parseYearParam(value)).toBeNull();
    },
  );
});
