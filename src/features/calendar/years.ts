import type { DateRange } from '@/features/diary';
import { parseYearParam as parseYear } from '@/shared/lib/years';

/** The first year the calendar shows - the same floor as the dates of the rest of the app (habits start at 2000-01-01). */
export const FIRST_YEAR = 2000;

/**
 * The year in the address (`/calendar?year=2025`); `null` for anything else - a missing or
 * hand-edited address falls back to the current year. Only years from the first one to
 * `lastYear` count: a year to come has no diary, so the calendar stops at the current one.
 */
export function parseYearParam(value: string | null, lastYear: number): number | null {
  return parseYear(value, FIRST_YEAR, lastYear);
}

/** The first and last day of the year as the list of days wants them. */
export function yearRange(year: number): DateRange {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}
