import { useQuery } from '@tanstack/react-query';
import type { HabitsGateway, OverviewQuery } from './habitsGateway';

/**
 * Query keys: the feature first, then what the data depends on. A key that starts with another
 * is its parent, so `all` refreshes everything about habits and `overviews` every month/day
 * that was looked at.
 */
export const habitKeys = {
  all: ['habits'] as const,
  overviews: ['habits', 'overview'] as const,
  overview: (query: OverviewQuery) => ['habits', 'overview', query] as const,
  details: (id: string) => ['habits', 'details', id] as const,
  marks: ['habits', 'marks'] as const,
};

/** Every habit with its plan, the done days inside the range and the current streak. */
export function useHabitOverview(gateway: HabitsGateway, query: OverviewQuery) {
  return useQuery({
    queryKey: habitKeys.overview(query),
    queryFn: ({ signal }) => gateway.overview(query, signal),
  });
}

/**
 * One habit as the server has it now, for the edit form. Never served from the cache: a form is
 * filled once from the data it gets, so a stale copy would end up in the person's changes.
 */
export function useHabitDetails(gateway: HabitsGateway, id: string) {
  return useQuery({
    queryKey: habitKeys.details(id),
    queryFn: ({ signal }) => gateway.details(id, signal),
    gcTime: 0,
  });
}
