import { format } from 'date-fns';

/** "Wednesday, 7 October" - with the year when it is not this year's. */
export function dayTitle(day: Date, now: Date = new Date()): string {
  return format(
    day,
    day.getFullYear() === now.getFullYear() ? 'EEEE, d MMMM' : 'EEEE, d MMMM yyyy',
  );
}
