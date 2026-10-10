import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { addMonths, format, isSameMonth, startOfMonth, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Tags } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  ManageTagsDialog,
  tagsGateway as defaultTagsGateway,
  type TagsGateway,
} from '@/features/tags';
import { errorMessage } from '@/shared/api';
import { toApiDate } from '@/shared/lib/dates';
import { useToday } from '@/shared/lib/useToday';
import {
  Button,
  Card,
  FormMessage,
  IconButton,
  PageHeader,
  Skeleton,
  SkeletonGroup,
} from '@/shared/ui';
import { CreateHabitDialog } from './CreateHabitDialog';
import { DayTagsDialog } from './DayTagsDialog';
import { DeleteHabitDialog } from './DeleteHabitDialog';
import { EditHabitDialog } from './EditHabitDialog';
import { GridLegend } from './GridLegend';
import { isQuota } from './quota';
import { HabitGrid } from './HabitGrid';
import { useMarkHabit } from './habitMutations';
import { useHabitOverview } from './habitQueries';
import { habitsGateway, type HabitsGateway } from './habitsGateway';
import { monthRange, parseMonthParam, toMonthParam } from './months';
import { habitKeys } from './habitQueries';

type DialogState =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; habitId: string }
  | { kind: 'tags'; habitId: string; date: string }
  | { kind: 'manage-tags' }
  | { kind: 'delete'; habit: { id: string; title: string } };

/**
 * The month tracker (DESIGN.md §4.3). One request feeds the whole grid; a tick changes the cell
 * at once and is sent in the background. The month is part of the address (`?month=2026-09`), so
 * a reload and the back button stay where the person was.
 */
export function HabitsPage({
  gateway = habitsGateway,
  tagsGateway = defaultTagsGateway,
}: {
  gateway?: HabitsGateway;
  tagsGateway?: TagsGateway;
}) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' });

  const now = useToday();
  const today = toApiDate(now);
  const month = parseMonthParam(searchParams.get('month')) ?? startOfMonth(now);

  const overview = useHabitOverview(gateway, { ...monthRange(month), asOf: today });
  const mark = useMarkHabit(gateway);

  function showMonth(target: Date) {
    // The current month is the default: keep its address clean.
    setSearchParams(isSameMonth(target, now) ? {} : { month: toMonthParam(target) });
  }

  const closeDialog = () => setDialog({ kind: 'none' });

  // The day being tagged is read from the overview on every render, so a tag that was just put
  // on it (optimistically) shows in the dialog at once; a habit that is gone closes it.
  const taggedHabit =
    dialog.kind === 'tags'
      ? overview.data?.find((habit) => habit.id === dialog.habitId)
      : undefined;
  const tagsTarget =
    dialog.kind === 'tags' && taggedHabit
      ? {
          habit: { id: taggedHabit.id, title: taggedHabit.title },
          date: dialog.date,
          tags: taggedHabit.taggedDays.find((day) => day.date === dialog.date)?.tags ?? [],
        }
      : null;

  /** What the card shows. Data that is there wins: a refresh that fails must not wipe the grid. */
  function renderBody() {
    const habits = overview.data;

    if (habits === undefined) {
      if (!overview.isError) {
        return (
          <SkeletonGroup label="Loading habits" className="flex flex-col gap-4">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-12" />
            ))}
          </SkeletonGroup>
        );
      }
      return (
        <div className="flex flex-col items-start gap-4">
          <FormMessage message={errorMessage(overview.error, 'The habits could not be loaded.')} />
          <Button variant="secondary" onClick={() => void overview.refetch()}>
            Try again
          </Button>
        </div>
      );
    }

    if (habits.length === 0) {
      return (
        <div className="flex flex-col items-start gap-4 py-4">
          <p className="text-neutral-800">
            No habits yet. Add the first one and tick it off here every day.
          </p>
          <Button onClick={() => setDialog({ kind: 'create' })}>Add your first habit</Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        <HabitGrid
          habits={habits}
          month={month}
          today={today}
          onToggle={(habit, date, done) => mark.mutate({ habitId: habit.id, date, done })}
          onTags={(habit, date) => setDialog({ kind: 'tags', habitId: habit.id, date })}
          onEdit={(habit) => setDialog({ kind: 'edit', habitId: habit.id })}
          onDelete={(habit) =>
            setDialog({ kind: 'delete', habit: { id: habit.id, title: habit.title } })
          }
        />
        <GridLegend quota={habits.some((habit) => isQuota(habit.recurrence))} />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        pinned
        kicker="Habits"
        title={format(month, 'MMMM yyyy')}
        actions={
          <>
            {!isSameMonth(month, now) && (
              <Button variant="ghost" size="sm" onClick={() => showMonth(now)}>
                This month
              </Button>
            )}
            <IconButton
              label="Previous month"
              variant="secondary"
              onClick={() => showMonth(subMonths(month, 1))}
            >
              <ChevronLeft />
            </IconButton>
            <IconButton
              label="Next month"
              variant="secondary"
              onClick={() => showMonth(addMonths(month, 1))}
            >
              <ChevronRight />
            </IconButton>
            <IconButton
              label="Manage tags"
              variant="secondary"
              onClick={() => setDialog({ kind: 'manage-tags' })}
            >
              <Tags />
            </IconButton>
            {/* On a phone just the plus: the header has room for little else beside the title. */}
            <Button
              className="max-sm:size-9 max-sm:px-0"
              onClick={() => setDialog({ kind: 'create' })}
            >
              <Plus className="size-5" aria-hidden />
              <span className="max-sm:sr-only">New habit</span>
            </Button>
          </>
        }
      />

      <Card className="mt-6">{renderBody()}</Card>

      <CreateHabitDialog gateway={gateway} open={dialog.kind === 'create'} onClose={closeDialog} />
      <EditHabitDialog
        gateway={gateway}
        habitId={dialog.kind === 'edit' ? dialog.habitId : null}
        onClose={closeDialog}
      />
      <DeleteHabitDialog
        gateway={gateway}
        habit={dialog.kind === 'delete' ? dialog.habit : null}
        onClose={closeDialog}
      />
      <DayTagsDialog
        gateway={gateway}
        tagsGateway={tagsGateway}
        target={tagsTarget}
        onClose={closeDialog}
      />
      <ManageTagsDialog
        gateway={tagsGateway}
        open={dialog.kind === 'manage-tags'}
        onClose={closeDialog}
        // Renaming, merging and deleting change what days carry: the grid asks again.
        onTagsChanged={() => void queryClient.invalidateQueries({ queryKey: habitKeys.overviews })}
      />
    </>
  );
}
