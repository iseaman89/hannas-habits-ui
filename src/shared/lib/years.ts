/**
 * The year in an address (`/calendar?year=2025`, `/resolutions?year=2027`); `null` for anything
 * else, so a missing or hand-edited address falls back to the screen's own default. Only exactly
 * four digits count - no sign, no padding, no spaces - and only years from `first` to `last`.
 */
export function parseYearParam(value: string | null, first: number, last: number): number | null {
  if (value === null || !/^\d{4}$/.test(value)) return null;
  const year = Number(value);
  return year >= first && year <= last ? year : null;
}
