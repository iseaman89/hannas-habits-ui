import { describe, expect, it } from 'vitest';
import { cellState, isToggleable, type CellState } from './cells';

// Wednesday 7 October 2026 is "today"; the habit started on Monday 5 October.
const TODAY = '2026-10-07';
const START = '2026-10-05';

// Every test says itself whether the server counts the day as due (`scheduledDates`).
function state(day: number, options: { scheduled?: boolean; done?: boolean } = {}): CellState {
  return cellState({
    date: new Date(2026, 9, day),
    today: TODAY,
    startDate: START,
    scheduled: options.scheduled ?? true,
    done: options.done ?? false,
  });
}

describe('cellState', () => {
  it('is "before-start" for every day before the first day, and never "missed"', () => {
    expect(state(4)).toBe('before-start');
    expect(state(1)).toBe('before-start');
  });

  it('counts the start day itself', () => {
    expect(state(5)).toBe('missed');
    expect(state(5, { done: true })).toBe('done');
  });

  it('draws a scheduled, past, open day as missed and a done one as done', () => {
    expect(state(6)).toBe('missed');
    expect(state(6, { done: true })).toBe('done');
  });

  it('draws today as due while open, and as done once marked', () => {
    expect(state(7)).toBe('due-today');
    expect(state(7, { done: true })).toBe('done');
  });

  it('draws a scheduled day in the future as upcoming', () => {
    expect(state(8)).toBe('upcoming');
    expect(state(30)).toBe('upcoming');
  });

  it('shows a day the rule does not make due as not scheduled, past or future', () => {
    expect(state(6, { scheduled: false })).toBe('not-scheduled');
    expect(state(8, { scheduled: false })).toBe('not-scheduled');
    expect(state(7, { scheduled: true })).toBe('due-today');
  });

  it('hides a record on a day that is not due or before the start', () => {
    expect(state(6, { scheduled: false, done: true })).toBe('not-scheduled');
    expect(state(3, { done: true })).toBe('before-start');
  });

  it('is "before-start" even where the server would not call the day due either', () => {
    // `scheduledDates` has no day before the start, so "not due" must not win over "not applicable".
    expect(state(3, { scheduled: false })).toBe('before-start');
  });

  it('keeps a record in the future visible, so it can be taken back', () => {
    expect(state(9, { done: true })).toBe('done');
  });

  it('goes by the local calendar day, not by the time of day', () => {
    // 00:30 on the first and 23:30 on the last day of the month are still those days.
    const early = cellState({
      date: new Date(2026, 9, 1, 0, 30),
      today: '2026-10-01',
      startDate: '2026-10-01',
      scheduled: true,
      done: false,
    });
    const late = cellState({
      date: new Date(2026, 9, 31, 23, 30),
      today: '2026-10-31',
      startDate: '2026-10-01',
      scheduled: true,
      done: false,
    });
    expect(early).toBe('due-today');
    expect(late).toBe('due-today');
  });
});

describe('isToggleable', () => {
  it.each<[CellState, boolean]>([
    ['done', true],
    ['missed', true],
    ['due-today', true],
    ['upcoming', false],
    ['not-scheduled', false],
    ['before-start', false],
  ])('%s -> %s', (cell, expected) => {
    expect(isToggleable(cell)).toBe(expected);
  });
});
