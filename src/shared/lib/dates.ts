import { format, isValid, parse } from 'date-fns';

const API_DATE_FORMAT = 'yyyy-MM-dd';

/**
 * The API's date format (`yyyy-MM-dd`) for the *local* calendar day of `date`.
 * Never use `toISOString()` for this: it is UTC and can be a day off.
 */
export function toApiDate(date: Date): string {
  return format(date, API_DATE_FORMAT);
}

/**
 * Parses a `yyyy-MM-dd` string (e.g. a route parameter) into local midnight of that day.
 * Returns `null` for anything that is not exactly that format or not a real calendar day.
 */
export function parseApiDate(value: string): Date | null {
  const parsed = parse(value, API_DATE_FORMAT, new Date());
  // date-fns also accepts "2026-2-3"; the round trip keeps only the canonical spelling.
  return isValid(parsed) && toApiDate(parsed) === value ? parsed : null;
}
