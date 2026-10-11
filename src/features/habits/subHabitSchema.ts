import { z } from 'zod';
import { TITLE_MAX_LENGTH } from './habitSchema';
import type { SubHabitInput } from './habitsGateway';
import type { SubHabit } from './subHabits';
import { inWeekOrder } from './weekdays';

const dayOfWeek = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

/**
 * What the add / change form checks before it sends anything. A part's title follows a habit's
 * (`HabitTitle` on the server), so it has the same limit; the server stays the authority - it
 * also refuses a title the habit has already (ignoring case) and a day the habit does not have,
 * and its answer is shown with the form.
 */
export const subHabitSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Give the part a name.')
    .max(TITLE_MAX_LENGTH, `Use at most ${TITLE_MAX_LENGTH} characters.`),
  weekdays: z.array(dayOfWeek).min(1, 'Pick at least one day.'),
});
export type SubHabitValues = z.infer<typeof subHabitSchema>;

/** A new part starts on all of the habit's days: the common case is "every time". */
export function emptySubHabit(days: SubHabitValues['weekdays']): SubHabitValues {
  return { title: '', weekdays: inWeekOrder(days) };
}

export function toSubHabitValues(part: Pick<SubHabit, 'title' | 'weekdays'>): SubHabitValues {
  return { title: part.title, weekdays: inWeekOrder(part.weekdays) };
}

export function toSubHabitInput(values: SubHabitValues): SubHabitInput {
  return { title: values.title, weekdays: inWeekOrder(values.weekdays) };
}
