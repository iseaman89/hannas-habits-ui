import { eachMonthOfInterval, getISODay, getMonth } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { toApiDate } from '@/shared/lib/dates';
import { weeksOfMonth } from './monthGrid';

/** The month as text, `.` for an empty cell. */
function draw(month: Date): string[] {
  return weeksOfMonth(month).map((week) =>
    week.map((day) => (day ? String(day.getDate()).padStart(2, ' ') : ' .')).join(' '),
  );
}

describe('a month as rows of seven, Monday first', () => {
  it('lays out October 2026, which starts on a Thursday', () => {
    expect(draw(new Date(2026, 9, 1))).toEqual([
      ' .  .  .  1  2  3  4',
      ' 5  6  7  8  9 10 11',
      '12 13 14 15 16 17 18',
      '19 20 21 22 23 24 25',
      '26 27 28 29 30 31  .',
    ]);
  });

  it('puts a Sunday last: 1 November 2026 is a Sunday', () => {
    expect(draw(new Date(2026, 10, 1))[0]).toBe(' .  .  .  .  .  .  1');
  });

  it('needs no gap for a month that starts on a Monday, and four rows for a 28-day one that does', () => {
    // 1 February 2027 is a Monday and the month has 28 days.
    expect(draw(new Date(2027, 1, 1))).toEqual([
      ' 1  2  3  4  5  6  7',
      ' 8  9 10 11 12 13 14',
      '15 16 17 18 19 20 21',
      '22 23 24 25 26 27 28',
    ]);
  });

  it('needs six rows when a 31-day month starts on a Saturday or Sunday (August 2026)', () => {
    // 1 August 2026 is a Saturday.
    const rows = draw(new Date(2026, 7, 1));
    expect(rows).toHaveLength(6);
    expect(rows[0]).toBe(' .  .  .  .  .  1  2');
    expect(rows[5]).toBe('31  .  .  .  .  .  .');
  });

  it('knows the leap day', () => {
    expect(
      draw(new Date(2028, 1, 1))
        .flat()
        .join(''),
    ).toContain('29');
    expect(
      draw(new Date(2027, 1, 1))
        .flat()
        .join(''),
    ).not.toContain('29');
  });

  it('takes any day of the month, not only the 1st', () => {
    expect(draw(new Date(2026, 9, 17))).toEqual(draw(new Date(2026, 9, 1)));
  });

  // Every month of ten years: all the days once, in order, on the right weekday column.
  const months = eachMonthOfInterval({ start: new Date(2020, 0, 1), end: new Date(2030, 0, 1) });
  it.each(months.map((month) => [toApiDate(month), month] as const))(
    'holds each day of %s once, in order, in the column of its weekday',
    (_, month) => {
      const weeks = weeksOfMonth(month);
      expect(weeks.every((week) => week.length === 7)).toBe(true);

      const days = weeks.flat().filter((day): day is Date => day !== null);
      expect(days.map((day) => day.getDate())).toEqual(
        Array.from({ length: days.length }, (_, index) => index + 1),
      );
      expect(days.every((day) => getMonth(day) === getMonth(month))).toBe(true);

      weeks.forEach((week) =>
        week.forEach((day, column) => {
          if (day) expect(getISODay(day) - 1).toBe(column);
        }),
      );
      // No row is empty (a trailing row of nothing but gaps would be an extra line).
      expect(weeks.every((week) => week.some((day) => day !== null))).toBe(true);
    },
  );
});
