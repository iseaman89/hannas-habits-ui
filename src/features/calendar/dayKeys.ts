import { addDays, isSameMonth, startOfISOWeek } from 'date-fns';

/**
 * Where an arrow key takes the focus within one month of the calendar, or `null` for "stay".
 * Days are local midnight; `canOpen` says which days are links (a day to come is not).
 *
 * - Left / Right: the day before / after. Up / Down: the same weekday a week earlier / later.
 * - Home / End: the first / last openable day of that week (weeks are Monday to Sunday and are
 *   cut off at the month's edges - every month is a table of its own).
 * - Never leaves the month and never lands on a day that is not a link; the person tabs to the
 *   next month. Anything else (letters, Tab, ...) is not ours: `null`.
 */
export function dayToFocus(from: Date, key: string, canOpen: (day: Date) => boolean): Date | null {
  const inReach = (day: Date) => isSameMonth(day, from) && canOpen(day);

  switch (key) {
    case 'ArrowLeft':
      return pick(addDays(from, -1), inReach);
    case 'ArrowRight':
      return pick(addDays(from, 1), inReach);
    case 'ArrowUp':
      return pick(addDays(from, -7), inReach);
    case 'ArrowDown':
      return pick(addDays(from, 7), inReach);
    case 'Home':
    case 'End': {
      const monday = startOfISOWeek(from);
      const week = Array.from({ length: 7 }, (_, offset) => addDays(monday, offset)).filter(
        inReach,
      );
      return (key === 'Home' ? week[0] : week[week.length - 1]) ?? null;
    }
    default:
      return null;
  }
}

function pick(day: Date, inReach: (day: Date) => boolean): Date | null {
  return inReach(day) ? day : null;
}
