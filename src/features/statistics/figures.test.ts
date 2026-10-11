import { describe, expect, it } from 'vitest';
import { countText, lastDoneText, lastDoneWhen, percentOf } from './figures';

describe('percentOf', () => {
  it.each([
    [9, 11, 82],
    [1, 3, 33],
    [2, 3, 67],
    [0, 5, 0],
    [5, 5, 100],
  ])('%i of %i is %i %%', (done, planned, expected) => {
    expect(percentOf(done, planned)).toBe(expected);
  });

  it('is nothing - not 0 % - when nothing was judged', () => {
    expect(percentOf(0, 0)).toBeNull();
  });

  it('never rounds a miss up to 100 % or a hit down to 0 %', () => {
    expect(percentOf(199, 200)).toBe(99);
    expect(percentOf(299, 300)).toBe(99);
    expect(percentOf(1, 300)).toBe(1);
  });
});

describe('countText', () => {
  it.each([
    ['days', 9, 11, 'Done on 9 of 11 days'],
    ['days', 1, 1, 'Done on 1 of 1 day'],
    ['days', 0, 4, 'Done on 0 of 4 days'],
    ['weeks', 3, 4, 'Reached the goal in 3 of 4 weeks'],
    ['weeks', 1, 1, 'Reached the goal in 1 of 1 week'],
    ['months', 2, 3, 'Reached the goal in 2 of 3 months'],
    ['months', 1, 1, 'Reached the goal in 1 of 1 month'],
  ] as const)('%s, %i of %i', (unit, done, planned, expected) => {
    expect(countText(unit, done, planned)).toBe(expected);
  });

  it('says so when nothing was judged yet, in any unit', () => {
    expect(countText('days', 0, 0)).toBe('Nothing to judge yet');
    expect(countText('weeks', 0, 0)).toBe('Nothing to judge yet');
  });
});

describe('lastDoneWhen / lastDoneText', () => {
  const today = '2026-10-11'; // a Sunday

  it.each([
    ['2026-10-11', 'today'],
    ['2026-10-10', 'yesterday'],
    ['2026-10-09', 'Fri 9 Oct · 2 days ago'],
    ['2026-10-03', 'Sat 3 Oct · 8 days ago'],
    ['2025-12-30', 'Tue 30 Dec 2025 · 285 days ago'],
  ])('%s is "%s"', (day, expected) => {
    expect(lastDoneWhen(day, today)).toBe(expected);
  });

  it('calls a record from the future "today" (the server ignores it, and so does the caller)', () => {
    expect(lastDoneWhen('2026-10-12', today)).toBe('today');
  });

  it('is nothing for a habit that was never done', () => {
    expect(lastDoneWhen(null, today)).toBeNull();
    expect(lastDoneText(null, today)).toBe('Not done yet');
  });

  it('makes a sentence of it', () => {
    expect(lastDoneText('2026-10-03', today)).toBe('Last done Sat 3 Oct · 8 days ago');
    expect(lastDoneText('2026-10-10', today)).toBe('Last done yesterday');
  });
});
