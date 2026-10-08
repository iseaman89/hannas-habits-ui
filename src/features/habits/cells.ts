import { toApiDate } from '@/shared/lib/dates';
import type { DayOfWeek } from './weekdays';

/**
 * What one day of one habit looks like in the grid (DESIGN.md §4.3).
 *
 * - `before-start`: the habit did not exist yet - "not applicable", never "missed".
 * - `not-scheduled`: not a day of the habit's plan. A record on such a day is kept by the server
 *   but not shown and not counted (the schedule has no history, DESIGN.md §9).
 * - `done`, `missed` (scheduled, past, open), `due-today`, `upcoming` (scheduled, in the future).
 */
export type CellState =
  'before-start' | 'not-scheduled' | 'done' | 'missed' | 'due-today' | 'upcoming';

interface CellInput {
  /** The day of the cell (local). */
  date: Date;
  /** The client's local today as `yyyy-MM-dd`. */
  today: string;
  /** The habit's first day, `yyyy-MM-dd`. */
  startDate: string;
  schedule: readonly DayOfWeek[];
  /** The server has a record for this day. */
  done: boolean;
}

/**
 * The state of a cell. All dates are compared as `yyyy-MM-dd` strings: that spelling sorts the
 * same as the calendar, and it is what the server sends, so no time zone can shift a day.
 */
export function cellState({ date, today, startDate, schedule, done }: CellInput): CellState {
  const day = toApiDate(date);
  if (day < startDate) return 'before-start';
  if (!schedule.includes(date.getDay() as DayOfWeek)) return 'not-scheduled';
  // A record in the future (made elsewhere) is shown as done so it can be taken back.
  if (done) return 'done';
  if (day > today) return 'upcoming';
  return day === today ? 'due-today' : 'missed';
}

/**
 * Past and today's cells toggle on click, and a done cell can always be taken back. The server
 * would accept marks on future or unscheduled days, so this is the one place that blocks them.
 */
export function isToggleable(state: CellState): boolean {
  return state === 'done' || state === 'missed' || state === 'due-today';
}
