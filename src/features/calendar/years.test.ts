import { describe, expect, it } from 'vitest';
import { FIRST_YEAR, parseYearParam, yearRange } from './years';

describe('the year in the address', () => {
  it.each([
    ['2026', 2026],
    ['2000', 2000],
    ['2025', 2025],
  ])('reads %s', (value, year) => {
    expect(parseYearParam(value, 2026)).toBe(year);
  });

  it.each([
    ['nothing in the address', null],
    ['', null],
    ['nonsense', null],
    ['26', null],
    ['02026', null],
    [' 2026', null],
    ['2026 ', null],
    ['2026-10', null],
    ['2.026', null],
    ['+2026', null],
    ['-2026', null],
    ['1999', null], // before the first year
    ['2027', null], // a year to come has no diary
    ['9999', null],
  ])('falls back for %s', (value, expected) => {
    expect(parseYearParam(value, 2026)).toBe(expected);
  });

  it('follows the last year it is given: next year is fine once it is that year', () => {
    expect(parseYearParam('2027', 2027)).toBe(2027);
    expect(parseYearParam('2027', 2026)).toBeNull();
  });

  it('starts at the first year', () => {
    expect(FIRST_YEAR).toBe(2000);
    expect(parseYearParam(String(FIRST_YEAR - 1), 2026)).toBeNull();
  });
});

describe('the range of a year', () => {
  it('runs from 1 January to 31 December, both included', () => {
    expect(yearRange(2026)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
    expect(yearRange(2000)).toEqual({ from: '2000-01-01', to: '2000-12-31' });
  });
});
