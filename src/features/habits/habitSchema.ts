import { z } from 'zod';
import { parseApiDate } from '@/shared/lib/dates';
import type { HabitDetails, HabitInput } from './habitsGateway';
import { toRecurrenceRequest, toRecurrenceValues } from './recurrence';
import { DEFAULT_RECURRENCE, recurrenceSchema } from './recurrenceSchema';

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
  // Named like the API's field, so a server complaint (`errors.recurrence.<fact>`) finds it.
  recurrence: recurrenceSchema,
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
  return {
    title: '',
    description: '',
    recurrence: { ...DEFAULT_RECURRENCE, weekdays: [...DEFAULT_RECURRENCE.weekdays] },
    startDate: today,
  };
}

export function toHabitValues(habit: HabitDetails): HabitValues {
  return {
    title: habit.title,
    description: habit.description ?? '',
    recurrence: toRecurrenceValues(habit.recurrence),
    startDate: habit.startDate,
  };
}

/** Blank means "no description": an explicit `null`, because leaving it out would clear it as well. */
export function toHabitInput(values: HabitValues): HabitInput {
  return {
    title: values.title,
    description: values.description === '' ? null : values.description,
    recurrence: toRecurrenceRequest(values.recurrence),
    startDate: values.startDate,
  };
}
