import { useQuery } from '@tanstack/react-query';
import type { ResolutionsGateway } from './resolutionsGateway';

/**
 * Query keys: the feature first, then the year. `all` refreshes every year that was looked at;
 * `writes` names the mutations that change an item (they share one serial queue, see
 * `resolutionMutations`).
 */
export const resolutionKeys = {
  all: ['resolutions'] as const,
  year: (year: number) => ['resolutions', year] as const,
  writes: ['resolutions', 'writes'] as const,
};

/**
 * The year's resolutions. Always asked again when the screen opens (`staleTime: 0`, the cached copy
 * is shown meanwhile): every item carries the *title* of the habit it is tracked by, and a habit is
 * renamed or deleted on another screen that must not know about this one. A list this short costs
 * nothing to re-read, and it is the one place that would otherwise show a stale or removed habit.
 */
export function useResolutions(gateway: ResolutionsGateway, year: number) {
  return useQuery({
    queryKey: resolutionKeys.year(year),
    queryFn: ({ signal }) => gateway.list(year, signal),
    staleTime: 0,
  });
}
