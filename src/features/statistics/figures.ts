import { differenceInCalendarDays, format } from 'date-fns';
import type { HabitStatistics } from '@/features/habits';
import { parseApiDate } from '@/shared/lib/dates';

/** What a statistic counts - the server's `unit`: days, or for a quota weeks or months. */
export type CountingUnit = HabitStatistics['unit'];

const SINGULAR: Record<CountingUnit, string> = { days: 'day', weeks: 'week', months: 'month' };

/**
 * How much of what was judged was met, as a whole percent. `null` when nothing was judged: there is
 * no share of nothing, and "0 %" would say the person did badly. A rounded 100 % never hides a
 * miss and a rounded 0 % never hides a hit: 199 of 200 is 99 %, 1 of 300 is 1 %.
 */
export function percentOf(done: number, planned: number): number | null {
  if (planned <= 0) return null;
  const percent = Math.round((done / planned) * 100);
  if (done < planned) return Math.min(99, Math.max(done > 0 ? 1 : 0, percent));
  return 100;
}

/** "Done on 9 of 11 days", "Reached the goal in 3 of 4 weeks", "Nothing to judge yet". */
export function countText(unit: CountingUnit, done: number, planned: number): string {
  if (planned <= 0) return 'Nothing to judge yet';

  const noun = planned === 1 ? SINGULAR[unit] : unit;
  return unit === 'days'
    ? `Done on ${done} of ${planned} ${noun}`
    : `Reached the goal in ${done} of ${planned} ${noun}`;
}

/**
 * When it was last done, as the end of a sentence: "today", "yesterday", "Sat 3 Oct · 8 days ago"
 * (the year only when it is not this one). `null` when it never was. `today` is the client's local
 * day (`yyyy-MM-dd`) - the same day the server judged as of.
 */
export function lastDoneWhen(lastDoneOn: string | null, today: string): string | null {
  if (lastDoneOn === null) return null;

  const date = parseApiDate(lastDoneOn);
  const now = parseApiDate(today);
  if (date === null || now === null) return lastDoneOn;

  const ago = differenceInCalendarDays(now, date);
  if (ago <= 0) return 'today';
  if (ago === 1) return 'yesterday';

  const day = format(
    date,
    date.getFullYear() === now.getFullYear() ? 'EEE d MMM' : 'EEE d MMM yyyy',
  );
  return `${day} · ${ago} days ago`;
}

/** "Last done Sat 3 Oct · 8 days ago", "Not done yet". */
export function lastDoneText(lastDoneOn: string | null, today: string): string {
  const when = lastDoneWhen(lastDoneOn, today);
  return when === null ? 'Not done yet' : `Last done ${when}`;
}
