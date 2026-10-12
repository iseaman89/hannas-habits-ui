import { toApiDate } from '@/shared/lib/dates';

/**
 * What one day of one habit looks like in the grid (DESIGN.md §4.3).
 *
 * - `before-start`: the habit did not exist yet - "not applicable", never "missed".
 * - `not-scheduled`: the habit's rule does not make this day due. A record on such a day is kept
 *   by the server but not shown and not counted (the rule has no history, DESIGN.md §9).
 * - `done`, `missed` (scheduled, past, open), `due-today`, `upcoming` (scheduled, in the future).
 * - `open`: a day of a quota habit ("3 times a week") that is not ticked - past or today. No day
 *   is *due*, so it is never "missed"; it can be ticked, and it counts when it is.
 */
export type CellState =
  'before-start' | 'not-scheduled' | 'done' | 'missed' | 'due-today' | 'upcoming' | 'open';

interface CellInput {
  /** The day of the cell (local). */
  date: Date;
  /** The client's local today as `yyyy-MM-dd`. */
  today: string;
  /** The habit's first day, `yyyy-MM-dd`. */
  startDate: string;
  /**
   * The habit is due on this day: the day is in the overview's `scheduledDates`. The rule itself
   * (weekdays, every N weeks, monthly, ...) is the server's, and so is this answer - the client
   * does not work it out from the rule.
   */
  scheduled: boolean;
  /** The server has a record for this day. */
  done: boolean;
  /**
   * The habit is a quota (`times a week / month`): no day is due, so `scheduled` does not matter
   * and an unticked day is `open`, not `missed`.
   */
  quota?: boolean;
}

/**
 * The state of a cell. All dates are compared as `yyyy-MM-dd` strings: that spelling sorts the
 * same as the calendar, and it is what the server sends, so no time zone can shift a day.
 */
export function cellState({
  date,
  today,
  startDate,
  scheduled,
  done,
  quota = false,
}: CellInput): CellState {
  const day = toApiDate(date);
  if (day < startDate) return 'before-start';
  if (!scheduled && !quota) return 'not-scheduled';
  // A record in the future (made elsewhere) is shown as done so it can be taken back.
  if (done) return 'done';
  if (day > today) return 'upcoming';
  if (quota) return 'open';
  return day === today ? 'due-today' : 'missed';
}

/**
 * Past and today's cells toggle on click, and a done cell can always be taken back. The server
 * would accept marks on future or unscheduled days, so this is the one place that blocks them.
 */
export function isToggleable(state: CellState): boolean {
  return state === 'done' || state === 'missed' || state === 'due-today' || state === 'open';
}
