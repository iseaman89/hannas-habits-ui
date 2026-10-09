import { describe, expect, it } from 'vitest';
import {
  EVERY_DAY,
  MONDAY_FIRST,
  WEEKDAYS,
  WEEKEND,
  dayName,
  inWeekOrder,
  sameDays,
  scheduleLabel,
  type DayOfWeek,
} from './weekdays';

describe('the week', () => {
  it('starts on Monday and ends on Sunday, which the API calls 0', () => {
    expect(MONDAY_FIRST).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(dayName(1).letter).toBe('M');
    expect(dayName(0).long).toBe('Sunday');
  });

  it('knows each API number by the same day as Date#getDay()', () => {
    // 2026-10-07 is a Wednesday.
    expect(dayName(new Date(2026, 9, 7).getDay() as DayOfWeek).long).toBe('Wednesday');
  });
});

describe('sameDays / inWeekOrder', () => {
  it('compares sets: order and duplicates do not matter', () => {
    expect(sameDays([0, 6], [6, 0, 6])).toBe(true);
    expect(sameDays([1, 2], [1, 3])).toBe(false);
    expect(sameDays([1], [1, 2])).toBe(false);
  });

  it('puts days in the order of the week, Sunday last, each once', () => {
    expect(inWeekOrder([0, 5, 1, 5])).toEqual([1, 5, 0]);
  });
});

describe('scheduleLabel', () => {
  it.each([
    [EVERY_DAY, 'Every day'],
    [[0, 1, 2, 3, 4, 5, 6] as DayOfWeek[], 'Every day'],
    [WEEKDAYS, 'Weekdays'],
    [[5, 4, 3, 2, 1] as DayOfWeek[], 'Weekdays'],
    [WEEKEND, 'Weekends'],
    [[1, 3, 5] as DayOfWeek[], 'Mon · Wed · Fri'],
    [[0, 1] as DayOfWeek[], 'Mon · Sun'],
    [[4] as DayOfWeek[], 'Thu'],
  ])('names %j as "%s"', (schedule, label) => {
    expect(scheduleLabel(schedule)).toBe(label);
  });
});
