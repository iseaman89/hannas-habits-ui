import type { QueryClient } from '@tanstack/react-query';
import type { TagSummary } from '@/features/tags';
import { habitKeys } from './habitQueries';
import type { HabitOverview, OverviewQuery } from './habitsGateway';
import type { SubHabit } from './subHabits';

/** One day of one habit becoming done or open. */
export interface CompletionChange {
  habitId: string;
  /** `yyyy-MM-dd` */
  date: string;
  done: boolean;
}

/** One day of one part of a habit becoming done or open. */
export interface SubHabitCompletionChange {
  habitId: string;
  subHabitId: string;
  /** `yyyy-MM-dd` */
  date: string;
  done: boolean;
}

/** A part ticked or un-ticked on a day (`completedDates` stay oldest first, without duplicates). */
function withPartTick(part: SubHabit, date: string, done: boolean): SubHabit {
  if (part.completedDates.includes(date) === done) return part;
  const others = part.completedDates.filter((completed) => completed !== date);
  return { ...part, completedDates: (done ? [...others, date] : others).sort() };
}

/**
 * The habit's own day, and for a quota habit the week or month of the day moves its `done`
 * along, so "2 of 3 this week" changes with the tick. The parts are left to the caller.
 */
function withHabitDay(habit: HabitOverview, date: string, done: boolean): HabitOverview {
  const wasDone = habit.completedDates.includes(date);
  const others = habit.completedDates.filter((completed) => completed !== date);
  // `yyyy-MM-dd` sorts the same as the calendar.
  const completedDates = (done ? [...others, date] : others).sort();

  // A day before the start does not count towards a period (the server leaves it out).
  const change = date < habit.startDate ? 0 : Number(done) - Number(wasDone);
  const quotaPeriods =
    change === 0
      ? habit.quotaPeriods
      : habit.quotaPeriods.map((period) =>
          period.from <= date && date <= period.to
            ? { ...period, done: Math.max(0, period.done + change) }
            : period,
        );
  return { ...habit, completedDates, quotaPeriods };
}

/**
 * The habit's own tick. The server's rule for parts goes along, so the day's parts show it at
 * once: ticking the habit ticks the parts that are due that day, un-ticking it clears every
 * part's tick of that day (also one that was not due). The server's own answer replaces all of
 * this when the screen asks again.
 */
export function withCompletion(
  habits: readonly HabitOverview[],
  { habitId, date, done }: CompletionChange,
): HabitOverview[] {
  return habits.map((habit) => {
    if (habit.id !== habitId) return habit;
    const day = withHabitDay(habit, date, done);
    return {
      ...day,
      subHabits: day.subHabits.map((part) => {
        if (!done) return withPartTick(part, date, false);
        return part.scheduledDates.includes(date) ? withPartTick(part, date, true) : part;
      }),
    };
  });
}

/**
 * One part ticked or un-ticked. The habit's day follows the server's rule: the last due part
 * completes the day, taking a due part back takes the day back. A tick on a day the part is not
 * due on is only a mark and leaves the habit's day alone.
 */
export function withSubHabitCompletion(
  habits: readonly HabitOverview[],
  { habitId, subHabitId, date, done }: SubHabitCompletionChange,
): HabitOverview[] {
  return habits.map((habit) => {
    if (habit.id !== habitId) return habit;
    const target = habit.subHabits.find((part) => part.id === subHabitId);
    if (!target) return habit;

    const subHabits = habit.subHabits.map((part) =>
      part.id === subHabitId ? withPartTick(part, date, done) : part,
    );
    const next = { ...habit, subHabits };
    // Not due that day: only a mark.
    if (!target.scheduledDates.includes(date)) return next;

    const dayIsDone = habit.completedDates.includes(date);
    // Taking back a due part takes the day back.
    if (!done) return dayIsDone ? withHabitDay(next, date, false) : next;

    // The last due part completes the day; a day that is done already stays as it is.
    const due = subHabits.filter((part) => part.scheduledDates.includes(date));
    const allDone = due.every((part) => part.completedDates.includes(date));
    return allDone && !dayIsDone ? withHabitDay(next, date, true) : next;
  });
}

/** One tag arriving on, or leaving, one day of one habit. */
export interface TagChange {
  habitId: string;
  date: string;
  tag: TagSummary;
  /** `true` = the day should carry the tag afterwards. */
  present: boolean;
}

/** What the server says a day carries after a call: replaces whatever the cache thought. */
export interface DayTags {
  habitId: string;
  date: string;
  tags: readonly TagSummary[];
}

const byName = (a: TagSummary, b: TagSummary) => a.name.localeCompare(b.name);

/**
 * The day's tags are set to `tags` (by name, as the server lists them). `taggedDays` stays oldest
 * first and holds only days that carry a tag - a day without any is not in it, like on the server.
 */
export function withDayTags(
  habits: readonly HabitOverview[],
  { habitId, date, tags }: DayTags,
): HabitOverview[] {
  return habits.map((habit) => {
    if (habit.id !== habitId) return habit;
    const others = habit.taggedDays.filter((day) => day.date !== date);
    const taggedDays =
      tags.length === 0 ? others : [...others, { date, tags: [...tags].sort(byName) }];
    return { ...habit, taggedDays: taggedDays.sort((a, b) => a.date.localeCompare(b.date)) };
  });
}

/** One tag put on a day or taken off it (twice is the same as once). */
export function withTagChange(
  habits: readonly HabitOverview[],
  { habitId, date, tag, present }: TagChange,
): HabitOverview[] {
  const current =
    habits.find((habit) => habit.id === habitId)?.taggedDays.find((day) => day.date === date)
      ?.tags ?? [];
  const others = current.filter((candidate) => candidate.id !== tag.id);
  return withDayTags(habits, { habitId, date, tags: present ? [...others, tag] : others });
}

function isOverviewQuery(value: unknown): value is OverviewQuery {
  return (
    typeof value === 'object' &&
    value !== null &&
    'from' in value &&
    typeof value.from === 'string' &&
    'to' in value &&
    typeof value.to === 'string'
  );
}

/**
 * Writes a change into every overview that was loaded and covers the day (the month grid and,
 * later, the diary's "today" panel look at different ranges of the same data).
 */
function applyToOverviews(
  queryClient: QueryClient,
  date: string,
  change: (habits: readonly HabitOverview[]) => HabitOverview[],
): void {
  const loaded = queryClient.getQueriesData<HabitOverview[]>({ queryKey: habitKeys.overviews });
  for (const [key, habits] of loaded) {
    const query = key[2];
    if (!habits || !isOverviewQuery(query)) continue;
    if (date < query.from || date > query.to) continue;
    queryClient.setQueryData(key, change(habits));
  }
}

/** The streak is left alone: it is the server's rule, and the screen asks for it afterwards. */
export function applyCompletion(queryClient: QueryClient, change: CompletionChange): void {
  applyToOverviews(queryClient, change.date, (habits) => withCompletion(habits, change));
}

export function applySubHabitCompletion(
  queryClient: QueryClient,
  change: SubHabitCompletionChange,
): void {
  applyToOverviews(queryClient, change.date, (habits) => withSubHabitCompletion(habits, change));
}

export function applyTagChange(queryClient: QueryClient, change: TagChange): void {
  applyToOverviews(queryClient, change.date, (habits) => withTagChange(habits, change));
}

export function applyDayTags(queryClient: QueryClient, day: DayTags): void {
  applyToOverviews(queryClient, day.date, (habits) => withDayTags(habits, day));
}
