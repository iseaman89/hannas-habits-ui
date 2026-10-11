import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { HabitStatistics } from '@/features/habits/habitsGateway';
import type { Recurrence } from './recurrence';

type CountingUnit = HabitStatistics['unit'];

/** What was planned in a range and how much of it was done. */
export interface Tally {
  planned: number;
  done: number;
}

const toDay = (date: Date) => format(date, 'yyyy-MM-dd');

/** The days of `from..to` (both included, `yyyy-MM-dd`), oldest first; none for a turned-round range. */
export function daysBetween(from: string, to: string): string[] {
  if (from > to) return [];
  return eachDayOfInterval({ start: parseISO(from), end: parseISO(to) }).map(toDay);
}

/** What a habit with this rule is counted in - the backend's `HabitStatistics.UnitOf`. */
export function unitOf(rule: Recurrence): CountingUnit {
  if (rule.kind === 'timesPerWeek') return 'weeks';
  if (rule.kind === 'timesPerMonth') return 'months';
  return 'days';
}

/**
 * The stand-in for the backend's `HabitStatistics.Tally` of a rule with due days: the due days up
 * to `asOf` are planned - `asOf` itself only once it is done, an open today is not a miss - and
 * `done` counts those of them that were completed. A completed day that was not due is not in
 * `dueDays` and so not counted.
 */
export function tallyDays(
  dueDays: readonly string[],
  completed: ReadonlySet<string>,
  asOf: string,
): Tally {
  const judged = dueDays.filter((day) => day < asOf || (day === asOf && completed.has(day)));
  return { planned: judged.length, done: judged.filter((day) => completed.has(day)).length };
}

/**
 * The same for a quota: the weeks (Monday to Sunday) or calendar months that *end* in `from..to`
 * and began on or after the start date. A period is judged when it is over (its last day is before
 * `asOf`); a running one only when it has already reached its number.
 */
export function tallyPeriods(
  rule: Recurrence,
  startDate: string,
  completed: ReadonlySet<string>,
  { from, to, asOf }: { from: string; to: string; asOf: string },
): Tally {
  const times = rule.times ?? 1;
  const week = rule.kind === 'timesPerWeek';
  const seen = new Set<string>();
  let planned = 0;
  let done = 0;

  for (const day of daysBetween(from, to)) {
    const date = parseISO(day);
    const first = toDay(week ? startOfWeek(date, { weekStartsOn: 1 }) : startOfMonth(date));
    const last = toDay(week ? endOfWeek(date, { weekStartsOn: 1 }) : endOfMonth(date));
    if (seen.has(first)) continue;
    seen.add(first);

    if (last > to || first < startDate) continue;

    const ticks = daysBetween(first, last < asOf ? last : asOf).filter(
      (tick) => tick >= startDate && completed.has(tick),
    ).length;
    if (last < asOf || ticks >= times) {
      planned++;
      if (ticks >= times) done++;
    }
  }

  return { planned, done };
}

/** The latest completed day on or before `asOf`, or `null`. */
export function lastDoneUpTo(completed: Iterable<string>, asOf: string): string | null {
  let last: string | null = null;
  for (const day of completed) {
    if (day <= asOf && (last === null || day > last)) last = day;
  }
  return last;
}
