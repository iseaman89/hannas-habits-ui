import { z } from 'zod';
import { parseApiDate } from '@/shared/lib/dates';
import type { HabitDetails, HabitInput } from './habitsGateway';
import { EVERY_DAY } from './weekdays';

/**
 * What the form checks before it sends anything. The limits mirror the backend's (`HabitTitle`,
 * `Habit.DescriptionMaxLength`); the server stays the authority and its answer is shown under the
 * field if it ever disagrees.
 */
export const TITLE_MAX_LENGTH = 150;
export const DESCRIPTION_MAX_LENGTH = 500;
/** `Habit.MinStartDate` / `MaxStartDate` of the backend. `yyyy-MM-dd` sorts like the calendar. */
export const START_DATE_MIN = '2000-01-01';
export const START_DATE_MAX = '2100-12-31';

const dayOfWeek = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

export const habitSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Give the habit a name.')
    .max(TITLE_MAX_LENGTH, `Use at most ${TITLE_MAX_LENGTH} characters.`),
  /** Optional; blank is fine. */
  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX_LENGTH, `Use at most ${DESCRIPTION_MAX_LENGTH} characters.`),
  // Named like the API's field, so a server complaint (`errors.schedule`) finds it by itself.
  schedule: z.array(dayOfWeek).min(1, 'Pick at least one day.'),
  /** `yyyy-MM-dd`, the first day the habit counts. An earlier one lets earlier days be filled in. */
  startDate: z
    .string()
    .refine((value) => parseApiDate(value) !== null, 'Pick a date.')
    .refine(
      (value) => value >= START_DATE_MIN && value <= START_DATE_MAX,
      'Use a date between 2000 and 2100.',
    ),
});
export type HabitValues = z.infer<typeof habitSchema>;

/**
 * A new habit starts as an every-day habit, like the server's default, and counts from `today`
 * (the client's local day, `yyyy-MM-dd`: the server's own date could be a day off).
 */
export function emptyHabit(today: string): HabitValues {
  return { title: '', description: '', schedule: [...EVERY_DAY], startDate: today };
}

export function toHabitValues(habit: HabitDetails): HabitValues {
  return {
    title: habit.title,
    description: habit.description ?? '',
    schedule: [...habit.schedule],
    startDate: habit.startDate,
  };
}

/** Blank means "no description": an explicit `null`, because leaving it out would clear it as well. */
export function toHabitInput(values: HabitValues): HabitInput {
  return {
    title: values.title,
    description: values.description === '' ? null : values.description,
    schedule: values.schedule,
    startDate: values.startDate,
  };
}
