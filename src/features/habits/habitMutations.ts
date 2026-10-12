import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tagKeys, type TagsGateway } from '@/features/tags';
import { errorMessage } from '@/shared/api';
import { useToast } from '@/shared/ui';
import { habitKeys } from './habitQueries';
import type { HabitInput, HabitsGateway, SubHabitInput } from './habitsGateway';
import {
  applyCompletion,
  applyDayTags,
  applySubHabitCompletion,
  applySubHabitNote,
  applyTagChange,
  type CompletionChange,
  type SubHabitCompletionChange,
  type SubHabitNoteChange,
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
 * What a mark - of a habit's day or of a part - does when it was the last one pending: the streak
 * and the habit's day (which follows its parts) are the server's rules, so the overview is asked
 * again, once and not per click. Returns nothing on purpose: waiting for the refetch would keep
 * this mutation pending and fool the count.
 */
function useSettleMarks() {
  const queryClient = useQueryClient();
  return () => {
    if (queryClient.isMutating({ mutationKey: habitKeys.marks }) === 1) {
      void queryClient.invalidateQueries({ queryKey: habitKeys.overviews });
    }
  };
}

/**
 * Ticking a day on or off, optimistically: the cell changes at once, the request follows.
 *
 * - **Serial.** All marks - a habit's day and a part's day alike - share one `scope`, so they reach
 *   the server one after the other in the order of the clicks. Two quick clicks on one cell (on,
 *   then off) are a PUT and a DELETE that could otherwise overtake each other and leave the server
 *   on "done" while the screen says open; a habit's tick and a part's tick of the same day
 *   change each other's result, so they queue together.
 * - **Rollback by inverse.** A failed mark is undone by writing the opposite into the cache, not by
 *   restoring a snapshot: a snapshot would also wipe the optimistic marks of the clicks after it.
 * - **Refresh once.** The streak is the server's rule, so the overview is fetched again - but only
 *   when the last pending mark has settled, not once per click.
 */
export function useMarkHabit(gateway: HabitsGateway) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const settle = useSettleMarks();

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
    onSettled: settle,
  });
}

/**
 * Ticking one part of a habit on a day, on or off, optimistically - under the rules of
 * `useMarkHabit` (the same serial `scope` and the same single refresh). The habit's own day
 * follows the part at once, as the server's rule has it; a failure writes the inverse part tick,
 * which takes the habit's day along the same way back.
 */
export function useMarkSubHabit(gateway: HabitsGateway) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const settle = useSettleMarks();

  return useMutation({
    mutationKey: habitKeys.marks,
    scope: { id: 'habit-marks' },
    mutationFn: ({ habitId, subHabitId, date, done }: SubHabitCompletionChange) =>
      done
        ? gateway.markSubHabit(habitId, subHabitId, date)
        : gateway.unmarkSubHabit(habitId, subHabitId, date),
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: habitKeys.overviews });
      applySubHabitCompletion(queryClient, change);
    },
    onError: (error, change) => {
      applySubHabitCompletion(queryClient, { ...change, done: !change.done });
      toast.error(errorMessage(error, 'Could not save that part. Please try again.'));
    },
    onSettled: settle,
  });
}

/**
 * Writing a part's note on a day, or taking it away (`text: null`), optimistically: the dot on
 * the cell and the text in the habit's card change at once, the request follows.
 *
 * - **Serial.** All note writes share one `scope`: the editor saves while the person types, and
 *   two requests for the same note must not overtake each other and leave an older text on top.
 * - **No inverse on failure.** There is no "opposite" of a text: the person said so, and the
 *   server's own list - fetched again - is the truth. The editor keeps its draft, so nothing typed
 *   is lost to the failure.
 * - **No refetch on success**: the server answers with what was sent (trimmed, as the editor
 *   sends it), so the cache already has it.
 */
export function useSaveSubHabitNote(gateway: HabitsGateway) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationKey: habitKeys.notes,
    scope: { id: 'habit-notes' },
    mutationFn: async ({ habitId, subHabitId, date, text }: SubHabitNoteChange) => {
      if (text === null) await gateway.clearSubHabitNote(habitId, subHabitId, date);
      else await gateway.setSubHabitNote(habitId, subHabitId, date, text);
    },
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: habitKeys.overviews });
      applySubHabitNote(queryClient, change);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Could not save that note. Please try again.'));
      void queryClient.invalidateQueries({ queryKey: habitKeys.overviews });
    },
  });
}

/**
 * After a part was added, changed or removed every view of the habits is out of date: the grid
 * (its "1/2" and the parts' days), the edit form's details, the lists. Returning the refresh keeps
 * the mutation pending until the new list is in, so the form does not flash the old one.
 */
function useRefreshAfterPartChange() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: habitKeys.all });
}

export function useAddSubHabit(gateway: HabitsGateway) {
  const refresh = useRefreshAfterPartChange();
  return useMutation({
    mutationFn: ({ habitId, input }: { habitId: string; input: SubHabitInput }) =>
      gateway.addSubHabit(habitId, input),
    onSuccess: refresh,
  });
}

export function useUpdateSubHabit(gateway: HabitsGateway) {
  const refresh = useRefreshAfterPartChange();
  return useMutation({
    mutationFn: ({
      habitId,
      subHabitId,
      input,
    }: {
      habitId: string;
      subHabitId: string;
      input: SubHabitInput;
    }) => gateway.updateSubHabit(habitId, subHabitId, input),
    onSuccess: refresh,
  });
}

export function useRemoveSubHabit(gateway: HabitsGateway) {
  const refresh = useRefreshAfterPartChange();
  return useMutation({
    mutationFn: ({ habitId, subHabitId }: { habitId: string; subHabitId: string }) =>
      gateway.removeSubHabit(habitId, subHabitId),
    onSuccess: refresh,
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
