import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/api';

/**
 * Whether a failed query is worth another try. A 4xx means the request itself is wrong (not
 * found, invalid, forbidden): asking again gives the same answer. No answer at all and 5xx are
 * temporary more often than not, so those get two more tries.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        // Data seen a moment ago is shown at once and refreshed in the background.
        staleTime: 30_000,
      },
      // Writes are never repeated by themselves: a second POST could be a second habit.
      mutations: { retry: false },
    },
  });
}
