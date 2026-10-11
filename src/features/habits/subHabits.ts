import type { HabitOverview } from './habitsGateway';
import type { Recurrence } from './recurrence';
import { EVERY_DAY, inWeekOrder, type DayOfWeek } from './weekdays';

/** One part of a habit ("Legs" of "Sport") as the overview has it. */
export type SubHabit = HabitOverview['subHabits'][number];

/** `Habit.MaxSubHabits` of the backend. The server stays the authority. */
export const MAX_SUB_HABITS = 10;

/**
 * The weekdays a part may be planned on: the days the habit itself is planned on, as the backend's
 * `Habit` checks them. A weekly rule has its chosen days, "the last Saturday" that weekday, every
 * other rule (every N days, a date of the month, a quota) has no weekday of its own - any will do.
 *
 * A copy of a server rule, used only to hide choices the server would refuse: the form never
 * decides anything with it, and the server's 400 is shown if the two ever disagree.
 */
export function habitWeekdays(recurrence: Recurrence): DayOfWeek[] {
  switch (recurrence.kind) {
    case 'weekly':
      return inWeekOrder(recurrence.weekdays);
    case 'monthlyOnWeekday':
      return recurrence.weekday === null ? [...EVERY_DAY] : [recurrence.weekday];
    default:
      return [...EVERY_DAY];
  }
}

/**
 * The parts that are due on the day. The server decides what "due" is (the habit is due *and* the
 * weekday is the part's own) and says it in each part's `scheduledDates`; the client only looks it
 * up, as for the habit's own cells.
 */
export function dueSubHabits(habit: { subHabits: readonly SubHabit[] }, date: string): SubHabit[] {
  return habit.subHabits.filter((part) => part.scheduledDates.includes(date));
}

export interface SubHabitProgress {
  done: number;
  due: number;
}

/** How far the day's parts have come; `null` when none is due (the day is the habit's own business). */
export function subHabitProgress(
  habit: { subHabits: readonly SubHabit[] },
  date: string,
): SubHabitProgress | null {
  const due = dueSubHabits(habit, date);
  if (due.length === 0) return null;
  return { due: due.length, done: due.filter((part) => part.completedDates.includes(date)).length };
}

/** The part's note on the day, or `undefined`. */
export function noteOn(part: Pick<SubHabit, 'notes'>, date: string): string | undefined {
  return part.notes.find((note) => note.date === date)?.text;
}

/**
 * The parts that have something to say about the day: the ones that are due and the ones that
 * carry a note (a note is independent of the plan, so a part that is not due can have one).
 * In the order the parts were added.
 */
export function partsOnDay(
  habit: { subHabits: readonly SubHabit[] },
  date: string,
): { part: SubHabit; note: string | undefined }[] {
  return habit.subHabits
    .map((part) => ({ part, note: noteOn(part, date) }))
    .filter(({ part, note }) => note !== undefined || part.scheduledDates.includes(date));
}

/** "1 part", "3 parts". */
export function partsLabel(count: number): string {
  return `${count} ${count === 1 ? 'part' : 'parts'}`;
}

/**
 * Days of a part that the habit's rhythm does not have (any more): the habit's rule was changed
 * after the part was planned. They are never due; the person is told, and can take them off.
 */
export function strandedWeekdays(part: Pick<SubHabit, 'weekdays'>, allowed: readonly DayOfWeek[]) {
  return inWeekOrder(part.weekdays.filter((day) => !allowed.includes(day)));
}
