import { describe, expect, it } from 'vitest';
import { toApiDate } from '@/shared/lib/dates';
import { dayToFocus } from './dayKeys';

// October 2026: the 1st is a Thursday, so the first row is Sep 28 - Oct 4 (cut off at the
// month's edge). "Today" is Wednesday the 7th: later days are not links.
const oct = (day: number) => new Date(2026, 9, day);
const upToTheSeventh = (day: Date) => day.getTime() <= oct(7).getTime();
const everyDay = () => true;

function go(from: number, key: string, canOpen = upToTheSeventh) {
  const target = dayToFocus(oct(from), key, canOpen);
  return target && toApiDate(target);
}

describe('dayToFocus', () => {
  it.each([
    ['ArrowRight', 5, '2026-10-06'],
    ['ArrowLeft', 5, '2026-10-04'],
    ['ArrowDown', 1, null], // the 8th has not begun
    ['ArrowUp', 7, null], // Sep 30: another month's table
  ])('%s from day %i', (key, from, expected) => {
    expect(go(from, key)).toBe(expected);
  });

  it('moves a week up and down with the same weekday', () => {
    expect(go(14, 'ArrowUp', everyDay)).toBe('2026-10-07');
    expect(go(14, 'ArrowDown', everyDay)).toBe('2026-10-21');
  });

  it('stays at the edges of the month', () => {
    expect(go(1, 'ArrowLeft')).toBeNull();
    expect(go(1, 'ArrowUp')).toBeNull();
    expect(go(31, 'ArrowRight', everyDay)).toBeNull();
    expect(go(31, 'ArrowDown', everyDay)).toBeNull();
  });

  it('does not step onto a day that is not a link', () => {
    expect(go(7, 'ArrowRight')).toBeNull(); // the 8th has not begun
    expect(go(5, 'ArrowDown')).toBeNull(); // the 12th neither
  });

  it('takes Home and End to the first and last openable day of the week, Monday to Sunday', () => {
    expect(go(7, 'Home')).toBe('2026-10-05');
    expect(go(5, 'End')).toBe('2026-10-07'); // Sunday the 11th is still to come
    expect(go(15, 'Home', everyDay)).toBe('2026-10-12');
    expect(go(15, 'End', everyDay)).toBe('2026-10-18');
  });

  it('cuts the week at the edges of the month', () => {
    expect(go(3, 'Home')).toBe('2026-10-01'); // not Monday Sep 28
    expect(go(1, 'End')).toBe('2026-10-04');
    expect(go(28, 'End', everyDay)).toBe('2026-10-31'); // the last row ends on Saturday the 31st
    expect(go(28, 'Home', everyDay)).toBe('2026-10-26');
  });

  it('answers a Home or End on the only openable day of the row with that day', () => {
    expect(go(1, 'Home', (day) => day.getDate() === 1)).toBe('2026-10-01');
  });

  it.each(['a', 'Tab', 'Enter', ' ', 'PageUp', 'PageDown', 'Escape'])('leaves %j alone', (key) => {
    expect(go(5, key)).toBeNull();
  });
});
