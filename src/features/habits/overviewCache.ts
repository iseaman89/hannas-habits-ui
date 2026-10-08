import type { QueryClient } from '@tanstack/react-query';
import { habitKeys } from './habitQueries';
import type { HabitOverview, OverviewQuery } from './habitsGateway';

/** One day of one habit becoming done or open. */
export interface CompletionChange {
  habitId: string;
  /** `yyyy-MM-dd` */
  date: string;
  done: boolean;
}

/** `completedDates` stay oldest first and without duplicates, as the server sends them. */
export function withCompletion(
  habits: readonly HabitOverview[],
  { habitId, date, done }: CompletionChange,
): HabitOverview[] {
  return habits.map((habit) => {
    if (habit.id !== habitId) return habit;
    const others = habit.completedDates.filter((completed) => completed !== date);
    // `yyyy-MM-dd` sorts the same as the calendar.
    const completedDates = (done ? [...others, date] : others).sort();
    return { ...habit, completedDates };
  });
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
 * later, the diary's "today" panel look at different ranges of the same data). The streak is
 * left alone: it is the server's rule, and the screen asks for the new value afterwards.
 */
export function applyCompletion(queryClient: QueryClient, change: CompletionChange): void {
  const loaded = queryClient.getQueriesData<HabitOverview[]>({ queryKey: habitKeys.overviews });
  for (const [key, habits] of loaded) {
    const query = key[2];
    if (!habits || !isOverviewQuery(query)) continue;
    if (change.date < query.from || change.date > query.to) continue;
    queryClient.setQueryData(key, withCompletion(habits, change));
  }
}
