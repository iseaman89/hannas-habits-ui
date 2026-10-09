import { useMutation, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '@/shared/api';
import { useToast } from '@/shared/ui';
import { applyKept } from './resolutionCache';
import { resolutionKeys } from './resolutionQueries';
import type {
  Resolution,
  ResolutionChange,
  ResolutionInput,
  ResolutionsGateway,
} from './resolutionsGateway';

/** After a change the year's list - and with it the count of kept ones - is out of date. */
function useRefreshResolutions() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: resolutionKeys.all });
}

/**
 * Every write of an existing item goes through one queue (`scope`). `PUT` replaces the whole
 * item, so two writes that overtook each other would leave the older state on the server: a
 * "kept" click and an edit of the title, or two quick clicks on one button.
 */
const WRITE_QUEUE = { id: 'resolution-writes' };

export function useAddResolution(gateway: ResolutionsGateway) {
  const refresh = useRefreshResolutions();
  // Returning the refresh keeps the mutation "pending" until the new item is in the list.
  return useMutation({
    mutationFn: ({ year, input }: { year: number; input: ResolutionInput }) =>
      gateway.add(year, input),
    onSuccess: refresh,
  });
}

/** Saves the edit dialog: the whole item with a new title and habit. */
export function useUpdateResolution(gateway: ResolutionsGateway) {
  const refresh = useRefreshResolutions();
  return useMutation({
    mutationKey: resolutionKeys.writes,
    scope: WRITE_QUEUE,
    mutationFn: ({ year, id, change }: { year: number; id: string; change: ResolutionChange }) =>
      gateway.update(year, id, change),
    onSuccess: refresh,
  });
}

export function useDeleteResolution(gateway: ResolutionsGateway) {
  const refresh = useRefreshResolutions();
  return useMutation({
    mutationKey: resolutionKeys.writes,
    scope: WRITE_QUEUE,
    mutationFn: ({ year, id }: { year: number; id: string }) => gateway.remove(year, id),
    onSuccess: refresh,
  });
}

export interface KeptChange {
  year: number;
  /** The item as it is on screen: the write carries its title and habit along unchanged. */
  item: Resolution;
  kept: boolean;
}

/**
 * Marking an item kept (or open again), optimistically: the button changes at once, the request
 * follows. Like ticking a habit (`useMarkHabit`):
 * - **Serial**, in the queue of all item writes, so quick clicks reach the server in order.
 * - **Rollback by inverse**: a failure writes the opposite back instead of restoring a snapshot,
 *   which would also undo the clicks made after it.
 * - **Refresh once**, when the last pending write has settled, to show what the server holds.
 */
export function useToggleKept(gateway: ResolutionsGateway) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationKey: resolutionKeys.writes,
    scope: WRITE_QUEUE,
    mutationFn: ({ year, item, kept }: KeptChange) =>
      gateway.update(year, item.id, { title: item.title, habitId: item.habitId, kept }),
    onMutate: async ({ year, item, kept }) => {
      // A refetch still on its way would bring back the state from before this click.
      await queryClient.cancelQueries({ queryKey: resolutionKeys.year(year) });
      applyKept(queryClient, year, item.id, kept);
    },
    onError: (error, { year, item, kept }) => {
      applyKept(queryClient, year, item.id, !kept);
      toast.error(errorMessage(error, 'Could not save that change. Please try again.'));
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: resolutionKeys.writes }) === 1) {
        void queryClient.invalidateQueries({ queryKey: resolutionKeys.all });
      }
    },
  });
}
