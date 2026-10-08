import type { Schema } from '@/shared/api';

/** The API's day of the week: `0 = Sunday … 6 = Saturday`, the same as `Date#getDay()`. */
export type DayOfWeek = Schema<'DayOfWeek'>;

/** The week as the design draws it (M T W T F S S): Monday first. */
export const MONDAY_FIRST: readonly DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

export const EVERY_DAY: readonly DayOfWeek[] = MONDAY_FIRST;
export const WEEKDAYS: readonly DayOfWeek[] = [1, 2, 3, 4, 5];
export const WEEKEND: readonly DayOfWeek[] = [6, 0];

const NAMES: Record<DayOfWeek, { letter: string; short: string; long: string }> = {
  0: { letter: 'S', short: 'Sun', long: 'Sunday' },
  1: { letter: 'M', short: 'Mon', long: 'Monday' },
  2: { letter: 'T', short: 'Tue', long: 'Tuesday' },
  3: { letter: 'W', short: 'Wed', long: 'Wednesday' },
  4: { letter: 'T', short: 'Thu', long: 'Thursday' },
  5: { letter: 'F', short: 'Fri', long: 'Friday' },
  6: { letter: 'S', short: 'Sat', long: 'Saturday' },
};

export function dayName(day: DayOfWeek) {
  return NAMES[day];
}

/** The same set of days, whatever the order or duplicates. */
export function sameDays(a: readonly DayOfWeek[], b: readonly DayOfWeek[]): boolean {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every((day) => right.has(day));
}

/** The days in the order of the week, Monday first, each once. */
export function inWeekOrder(days: readonly DayOfWeek[]): DayOfWeek[] {
  const wanted = new Set(days);
  return MONDAY_FIRST.filter((day) => wanted.has(day));
}

/** "Every day", "Weekdays", "Weekends", otherwise "Mon · Wed · Fri". */
export function scheduleLabel(schedule: readonly DayOfWeek[]): string {
  if (sameDays(schedule, EVERY_DAY)) return 'Every day';
  if (sameDays(schedule, WEEKDAYS)) return 'Weekdays';
  if (sameDays(schedule, WEEKEND)) return 'Weekends';
  return inWeekOrder(schedule)
    .map((day) => NAMES[day].short)
    .join(' · ');
}
