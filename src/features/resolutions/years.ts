import { parseYearParam as parseYear } from '@/shared/lib/years';

/** The server's bounds (`Resolution.MinYear` / `MaxYear`): anything else is answered with a 400. */
export const FIRST_YEAR = 2000;
export const LAST_YEAR = 2100;

/**
 * The year in the address (`/resolutions?year=2027`); `null` for anything else - a missing or
 * hand-edited address falls back to the current year. Unlike the calendar this one may look
 * ahead: next year's resolutions are made in advance.
 */
export function parseYearParam(value: string | null): number | null {
  return parseYear(value, FIRST_YEAR, LAST_YEAR);
}
