import { z } from 'zod';
import { parseApiDate } from '@/shared/lib/dates';
import { EVERY_DAY } from './weekdays';

/**
 * The limits mirror the backend's `HabitSchedule`; the server stays the authority and its answer
 * is shown under the field if it ever disagrees.
 */
export const MAX_WEEK_INTERVAL = 52;
export const MIN_DAY_INTERVAL = 2;
export const MAX_DAY_INTERVAL = 365;
export const MAX_DAY_OF_MONTH = 31;
/**
 * "N times a week / month" (a quota, no fixed day). A month's limit is 28 so that every month -
 * February too - can reach it.
 */
export const MAX_TIMES_PER_WEEK = 7;
export const MAX_TIMES_PER_MONTH = 28;
/** The earliest and latest day a rhythm may count from (the same range as a start date). */
export const ANCHOR_MIN = '2000-01-01';
export const ANCHOR_MAX = '2100-12-31';

export const SCHEDULE_KINDS = [
  'weekly',
  'everyNDays',
  'monthlyOnWeekday',
  'monthlyOnDate',
  'timesPerWeek',
  'timesPerMonth',
] as const;
export const OCCURRENCES = ['first', 'second', 'third', 'fourth', 'last'] as const;

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
 * The rule as the form holds it: **flat**, like the API's `recurrence`, and every kind's facts
 * stay in it while another kind is chosen - so going from "last Saturday" to "every 3rd day" and
 * back does not lose the Saturday. Only the chosen kind's facts are checked and sent
 * (`toRecurrenceRequest`). A number is `null` while its field is empty.
 *
 * The checks sit on the object, not on the fields: a field of a kind that is not chosen is not on
 * screen, and an error there would block the form without anything to point at.
 */
export const recurrenceSchema = z
  .object({
    kind: z.enum(SCHEDULE_KINDS),
    /** Weekly: the chosen days, Monday first. */
    weekdays: z.array(dayOfWeek),
    /** Weekly: every N weeks (1 = every week). */
    everyWeeks: z.number().nullable(),
    /** Every N days. */
    everyDays: z.number().nullable(),
    /**
     * The day a rhythm (every N weeks, every N days) counts from. `null` = the habit's start day.
     * It is part of the rule: moving the start date must not shift the rhythm, so an edit sends
     * the one the habit already has.
     */
    anchor: z.string().nullable(),
    /** Monthly on a weekday: which one, and the weekday. */
    occurrence: z.enum(OCCURRENCES),
    weekday: dayOfWeek,
    /** Monthly on a date: 1..31 (29..31 fall on the last day of a shorter month). */
    dayOfMonth: z.number().nullable(),
    /** Times a week (1..7) or times a month (1..28): how often, on whichever days. */
    times: z.number().nullable(),
  })
  .superRefine((rule, context) => {
    const problem = (path: keyof typeof rule, message: string) =>
      context.addIssue({ code: 'custom', path: [path], message });
    const wholeNumber = (value: number | null, min: number, max: number) =>
      value !== null && Number.isInteger(value) && value >= min && value <= max;

    if (rule.kind === 'weekly') {
      if (rule.weekdays.length === 0) problem('weekdays', 'Pick at least one day.');
      if (!wholeNumber(rule.everyWeeks, 1, MAX_WEEK_INTERVAL)) {
        problem('everyWeeks', `Use a whole number from 1 to ${MAX_WEEK_INTERVAL}.`);
      }
    }

    if (
      rule.kind === 'everyNDays' &&
      !wholeNumber(rule.everyDays, MIN_DAY_INTERVAL, MAX_DAY_INTERVAL)
    ) {
      problem('everyDays', `Use a whole number from ${MIN_DAY_INTERVAL} to ${MAX_DAY_INTERVAL}.`);
    }

    if (rule.kind === 'monthlyOnDate' && !wholeNumber(rule.dayOfMonth, 1, MAX_DAY_OF_MONTH)) {
      problem('dayOfMonth', `Use a day from 1 to ${MAX_DAY_OF_MONTH}.`);
    }

    if (rule.kind === 'timesPerWeek' && !wholeNumber(rule.times, 1, MAX_TIMES_PER_WEEK)) {
      problem('times', `Use a whole number from 1 to ${MAX_TIMES_PER_WEEK}.`);
    }

    if (rule.kind === 'timesPerMonth' && !wholeNumber(rule.times, 1, MAX_TIMES_PER_MONTH)) {
      problem('times', `Use a whole number from 1 to ${MAX_TIMES_PER_MONTH}.`);
    }

    // An explicit anchor only matters for the rules that count from a day.
    const counts =
      (rule.kind === 'weekly' && (rule.everyWeeks ?? 1) > 1) || rule.kind === 'everyNDays';
    if (counts && rule.anchor !== null) {
      if (parseApiDate(rule.anchor) === null) problem('anchor', 'Pick a date.');
      else if (rule.anchor < ANCHOR_MIN || rule.anchor > ANCHOR_MAX) {
        problem('anchor', 'Use a date between 2000 and 2100.');
      }
    }
  });

export type RecurrenceValues = z.infer<typeof recurrenceSchema>;

/**
 * What a new habit starts with, like the server's default: every day, every week. The facts of
 * the other kinds are what the picker shows the first time they are chosen.
 */
export const DEFAULT_RECURRENCE: RecurrenceValues = {
  kind: 'weekly',
  weekdays: [...EVERY_DAY],
  everyWeeks: 1,
  everyDays: MIN_DAY_INTERVAL,
  anchor: null,
  occurrence: 'first',
  weekday: 1,
  dayOfMonth: 1,
  times: 3,
};
