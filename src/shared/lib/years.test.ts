import { describe, expect, it } from 'vitest';
import { parseYearParam } from './years';

describe('the year in an address', () => {
  it.each([
    ['2000', 2000], // the first year is allowed
    ['2026', 2026],
    ['2100', 2100], // so is the last
  ])('reads %s', (value, year) => {
    expect(parseYearParam(value, 2000, 2100)).toBe(year);
  });

  it.each([
    [null],
    [''],
    ['nonsense'],
    ['26'],
    ['02026'],
    [' 2026'],
    ['2026 '],
    ['2026-10'],
    ['2.026'],
    ['+2026'],
    ['-2026'],
    ['1999'], // before the first year
    ['2101'], // after the last
    ['9999'],
  ])('falls back for %s', (value) => {
    expect(parseYearParam(value, 2000, 2100)).toBeNull();
  });

  it('follows the bounds it is given', () => {
    expect(parseYearParam('2027', 2000, 2026)).toBeNull();
    expect(parseYearParam('2027', 2000, 2027)).toBe(2027);
    expect(parseYearParam('2010', 2011, 2026)).toBeNull();
    expect(parseYearParam('2011', 2011, 2026)).toBe(2011);
  });
});
