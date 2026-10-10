import { format, startOfWeek } from 'date-fns';
import type { Schema } from '@/shared/api';
import { parseApiDate } from '@/shared/lib/dates';
import { DEFAULT_RECURRENCE, MIN_DAY_INTERVAL, type RecurrenceValues } from './recurrenceSchema';
import {
  EVERY_DAY,
  WEEKDAYS,
  WEEKEND,
  dayName,
  inWeekOrder,
  sameDays,
  scheduleLabel,
  type DayOfWeek,
} from './weekdays';

/** The rule as the server answers with it (`recurrence` of a habit). */
export type Recurrence = Schema<'RecurrenceDto'>;
/** The rule as the server takes it: one flat object, only the facts of its `kind` are read. */
export type RecurrenceRequest = Schema<'RecurrenceRequest'>;
export type ScheduleKind = Schema<'ScheduleKind'>;
export type WeekdayOccurrence = Schema<'WeekdayOccurrence'>;

/** What the form starts with for a rule the server sent. */
export function toRecurrenceValues(recurrence: Recurrence): RecurrenceValues {
  const { kind } = recurrence;
  return {
    kind,
    // The facts of the other kinds are empty in the answer: the form keeps its defaults for them.
    weekdays:
      kind === 'weekly' ? inWeekOrder(recurrence.weekdays) : [...DEFAULT_RECURRENCE.weekdays],
    everyWeeks: kind === 'weekly' ? recurrence.interval : DEFAULT_RECURRENCE.everyWeeks,
    everyDays: kind === 'everyNDays' ? recurrence.interval : DEFAULT_RECURRENCE.everyDays,
    anchor: recurrence.anchor,
    occurrence: recurrence.occurrence ?? DEFAULT_RECURRENCE.occurrence,
    weekday: recurrence.weekday ?? DEFAULT_RECURRENCE.weekday,
    dayOfMonth: recurrence.dayOfMonth ?? DEFAULT_RECURRENCE.dayOfMonth,
    times: recurrence.times ?? DEFAULT_RECURRENCE.times,
  };
}

/**
 * The request for a rule that passed `recurrenceSchema`: the chosen kind's facts and nothing else
 * (the server would ignore the rest, but a body that says what it means is easier to read in the
 * network tab). The anchor goes along only when there is one - left out, the server counts from
 * the start date it saves.
 */
export function toRecurrenceRequest(rule: RecurrenceValues): RecurrenceRequest {
  switch (rule.kind) {
    case 'weekly': {
      const interval = rule.everyWeeks ?? 1;
      const request: RecurrenceRequest = {
        kind: 'weekly',
        weekdays: inWeekOrder(rule.weekdays),
        interval,
      };
      // "Every week" has no day to count from.
      if (interval > 1 && rule.anchor !== null) request.anchor = rule.anchor;
      return request;
    }
    case 'everyNDays': {
      const request: RecurrenceRequest = {
        kind: 'everyNDays',
        interval: rule.everyDays ?? MIN_DAY_INTERVAL,
      };
      if (rule.anchor !== null) request.anchor = rule.anchor;
      return request;
    }
    case 'monthlyOnWeekday':
      return { kind: 'monthlyOnWeekday', occurrence: rule.occurrence, weekday: rule.weekday };
    case 'monthlyOnDate':
      return { kind: 'monthlyOnDate', dayOfMonth: rule.dayOfMonth ?? 1 };
    case 'timesPerWeek':
      return { kind: 'timesPerWeek', times: rule.times ?? 1 };
    case 'timesPerMonth':
      return { kind: 'timesPerMonth', times: rule.times ?? 1 };
  }
}

/** The same rule - what would be sent is the same, whatever the unused facts hold. */
export function sameRecurrence(a: RecurrenceValues, b: RecurrenceValues): boolean {
  return JSON.stringify(toRecurrenceRequest(a)) === JSON.stringify(toRecurrenceRequest(b));
}

/** 1st, 2nd, 3rd, 4th … 11th, 12th, 13th … 21st, 22nd. */
export function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

const OCCURRENCE_NAMES: Record<WeekdayOccurrence, string> = {
  first: 'First',
  second: 'Second',
  third: 'Third',
  fourth: 'Fourth',
  last: 'Last',
};

/** "Mon", "Mon and Thu", "Mon, Wed and Fri". */
function listOf(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

function daysPhrase(days: readonly DayOfWeek[]): string {
  if (sameDays(days, EVERY_DAY)) return 'all days';
  if (sameDays(days, WEEKDAYS)) return 'weekdays';
  if (sameDays(days, WEEKEND)) return 'weekends';
  return listOf(inWeekOrder(days).map((day) => dayName(day).short));
}

/** "Once", "Twice", "3 times": how often, for "Once a week", "Twice a month", "3 times a week". */
export function timesPhrase(times: number): string {
  if (times === 1) return 'Once';
  if (times === 2) return 'Twice';
  return `${times} times`;
}

/**
 * The rule in a few words, for the line under a habit's name: "Every day", "Mon · Wed · Fri",
 * "Every 2nd week on Mon and Thu", "Every 3rd day", "Last Saturday of the month", "On the 15th of
 * the month", "3 times a week". "Every week on some days" keeps the wording the grid has always had.
 */
export function recurrenceLabel(rule: RecurrenceValues): string {
  switch (rule.kind) {
    case 'weekly': {
      const every = rule.everyWeeks ?? 1;
      if (every <= 1) return scheduleLabel(rule.weekdays);
      return `Every ${ordinal(every)} week on ${daysPhrase(rule.weekdays)}`;
    }
    case 'everyNDays':
      return `Every ${ordinal(rule.everyDays ?? MIN_DAY_INTERVAL)} day`;
    case 'monthlyOnWeekday':
      return `${OCCURRENCE_NAMES[rule.occurrence]} ${dayName(rule.weekday).long} of the month`;
    case 'monthlyOnDate': {
      const day = rule.dayOfMonth ?? 1;
      // The 31st is "the last day" of every month: a shorter month uses its own last day.
      return day === 31 ? 'Last day of the month' : `On the ${ordinal(day)} of the month`;
    }
    case 'timesPerWeek':
      return `${timesPhrase(rule.times ?? 1)} a week`;
    case 'timesPerMonth':
      return `${timesPhrase(rule.times ?? 1)} a month`;
  }
}

function formatDay(date: Date): string {
  return format(date, 'EEE d MMM yyyy');
}

/**
 * The rule as a sentence for the form, with what the label leaves out: where a rhythm counts from
 * (`startDate` stands in while the rule has no day of its own) and what a short month does.
 */
export function recurrenceSummary(rule: RecurrenceValues, startDate: string): string {
  const label = recurrenceLabel(rule);
  const from = parseApiDate(rule.anchor ?? startDate);

  switch (rule.kind) {
    case 'weekly': {
      if ((rule.everyWeeks ?? 1) <= 1) {
        return sameDays(rule.weekdays, EVERY_DAY)
          ? 'Every day'
          : `Every week on ${daysPhrase(rule.weekdays)}`;
      }
      // Weeks start on Monday; the week that holds the day is the first one.
      return from
        ? `${label}, starting with the week of ${formatDay(startOfWeek(from, { weekStartsOn: 1 }))}`
        : label;
    }
    case 'everyNDays':
      return from ? `${label}, starting ${formatDay(from)}` : label;
    case 'monthlyOnDate': {
      const day = rule.dayOfMonth ?? 1;
      return day >= 29 && day < 31 ? `${label} (the last day of a shorter month)` : label;
    }
    case 'monthlyOnWeekday':
      return label;
    case 'timesPerWeek':
      return `${label}, on whichever days - the week runs Monday to Sunday`;
    case 'timesPerMonth':
      return `${label}, on whichever days - the calendar month counts`;
  }
}
