import { useQuery } from '@tanstack/react-query';
import type { TagsGateway } from './tagsGateway';

/** `all` refreshes every list of tags (counts and order change whenever a day is tagged). */
export const tagKeys = {
  all: ['tags'] as const,
  list: (habitId: string | null) => ['tags', 'list', habitId] as const,
};

/**
 * The person's tags. With a habit they come ordered for it (its own tags first): that is the
 * suggestion list of a habit's day.
 */
export function useTags(gateway: TagsGateway, habitId: string | null = null) {
  return useQuery({
    queryKey: tagKeys.list(habitId),
    queryFn: ({ signal }) => gateway.list(habitId ?? undefined, signal),
  });
}
