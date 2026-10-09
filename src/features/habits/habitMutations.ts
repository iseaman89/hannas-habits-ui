import { useMutation, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '@/shared/api';
import { useToast } from '@/shared/ui';
import { habitKeys } from './habitQueries';
import type { HabitInput, HabitsGateway } from './habitsGateway';
import { applyCompletion, type CompletionChange } from './overviewCache';

/** After a change of the habits themselves every view of them is out of date. */
function useRefreshHabits() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: habitKeys.all });
}

export function useCreateHabit(gateway: HabitsGateway) {
  const refresh = useRefreshHabits();
  // Returning the refresh keeps the mutation "pending" until the new habit is in the list.
  return useMutation({ mutationFn: gateway.create, onSuccess: refresh });
}

export function useUpdateHabit(gateway: HabitsGateway) {
  const refresh = useRefreshHabits();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: HabitInput }) => gateway.update(id, input),
    onSuccess: refresh,
  });
}

export function useDeleteHabit(gateway: HabitsGateway) {
  const refresh = useRefreshHabits();
  return useMutation({ mutationFn: gateway.remove, onSuccess: refresh });
}

/**
 * Ticking a day on or off, optimistically: the cell changes at once, the request follows.
 *
 * - **Serial.** All marks share one `scope`, so they reach the server one after the other in the
 *   order of the clicks. Two quick clicks on one cell (on, then off) are a PUT and a DELETE that
 *   could otherwise overtake each other and leave the server on "done" while the screen says open.
 * - **Rollback by inverse.** A failed mark is undone by writing the opposite into the cache, not by
 *   restoring a snapshot: a snapshot would also wipe the optimistic marks of the clicks after it.
 * - **Refresh once.** The streak is the server's rule, so the overview is fetched again - but only
 *   when the last pending mark has settled, not once per click. (`onSettled` returns nothing on
 *   purpose: waiting for the refetch would keep this mutation pending and fool that count.)
 */
export function useMarkHabit(gateway: HabitsGateway) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationKey: habitKeys.marks,
    scope: { id: 'habit-marks' },
    mutationFn: ({ habitId, date, done }: CompletionChange) =>
      done ? gateway.mark(habitId, date) : gateway.unmark(habitId, date),
    onMutate: async (change) => {
      // A refetch still on its way would bring back the state from before this click.
      await queryClient.cancelQueries({ queryKey: habitKeys.overviews });
      applyCompletion(queryClient, change);
    },
    onError: (error, change) => {
      applyCompletion(queryClient, { ...change, done: !change.done });
      toast.error(errorMessage(error, 'Could not save that day. Please try again.'));
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: habitKeys.marks }) === 1) {
        void queryClient.invalidateQueries({ queryKey: habitKeys.overviews });
      }
    },
  });
}
