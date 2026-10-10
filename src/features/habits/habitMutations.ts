import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tagKeys, type TagsGateway } from '@/features/tags';
import { errorMessage } from '@/shared/api';
import { useToast } from '@/shared/ui';
import { habitKeys } from './habitQueries';
import type { HabitInput, HabitsGateway } from './habitsGateway';
import {
  applyCompletion,
  applyDayTags,
  applyTagChange,
  type CompletionChange,
  type TagChange,
} from './overviewCache';

/**
 * After a change of the habits themselves every view of them is out of date - and the tags'
 * use counts, which are counted over the habits' days (a deleted habit takes its days along).
 */
function useRefreshHabits() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: habitKeys.all }),
      queryClient.invalidateQueries({ queryKey: tagKeys.all }),
    ]);
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

/** What a tag mutation does when it was the last one pending: look at the server's truth once. */
function useSettleDayTags() {
  const queryClient = useQueryClient();
  return () => {
    if (queryClient.isMutating({ mutationKey: habitKeys.dayTags }) !== 1) return;
    // Also the lists of tags: how often a tag is used (and so their order) just changed.
    void queryClient.invalidateQueries({ queryKey: habitKeys.overviews });
    void queryClient.invalidateQueries({ queryKey: tagKeys.all });
  };
}

/**
 * Putting an existing tag on a day, or taking it off, optimistically - the same three rules as
 * the marks: one serial `scope` (a PUT and a DELETE of one tag must not overtake each other), a
 * failure is undone by writing the inverse (not by restoring a snapshot that would also wipe the
 * clicks after it), and the server is asked again only once, after the last pending call.
 */
export function useTagDay(gateway: HabitsGateway) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const settle = useSettleDayTags();

  return useMutation({
    mutationKey: habitKeys.dayTags,
    scope: { id: 'habit-day-tags' },
    mutationFn: ({ habitId, date, tag, present }: TagChange) =>
      present ? gateway.tagDay(habitId, date, tag.id) : gateway.untagDay(habitId, date, tag.id),
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: habitKeys.overviews });
      applyTagChange(queryClient, change);
    },
    onError: (error, change) => {
      applyTagChange(queryClient, { ...change, present: !change.present });
      toast.error(errorMessage(error, 'Could not save the tags. Please try again.'));
    },
    onSettled: settle,
  });
}

/**
 * A name that is not in the list yet: the tag is made (or found - creating is get-or-create) and
 * put on the day. Not optimistic: there is no id before the server has answered. The answer is
 * the day's tags, so the cache takes it as it is. Same scope as `useTagDay`, so it queues behind
 * the clicks before it. The caller shows a failure next to the input, where the typed name stays.
 */
export function useTagDayWithNewTag(gateway: HabitsGateway, tags: TagsGateway) {
  const queryClient = useQueryClient();
  const settle = useSettleDayTags();

  return useMutation({
    mutationKey: habitKeys.dayTags,
    scope: { id: 'habit-day-tags' },
    mutationFn: async ({
      habitId,
      date,
      name,
    }: {
      habitId: string;
      date: string;
      name: string;
    }) => {
      const tag = await tags.create(name);
      return gateway.tagDay(habitId, date, tag.id);
    },
    onSuccess: (day, { habitId }) =>
      applyDayTags(queryClient, { habitId, date: day.date, tags: day.tags }),
    onSettled: settle,
  });
}
