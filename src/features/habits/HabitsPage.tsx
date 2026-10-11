import { useState } from 'react';
import { addMonths, format, isSameMonth, startOfMonth, subMonths } from 'date-fns';
import { ChartNoAxesColumn, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { errorMessage } from '@/shared/api';
import { toApiDate } from '@/shared/lib/dates';
import { useToday } from '@/shared/lib/useToday';
import {
  Button,
  buttonClassName,
  Card,
  FormMessage,
  IconButton,
  PageHeader,
  Skeleton,
  SkeletonGroup,
} from '@/shared/ui';
import { CreateHabitDialog } from './CreateHabitDialog';
import { DayPartsDialog } from './DayPartsDialog';
import { DeleteHabitDialog } from './DeleteHabitDialog';
import { EditHabitDialog } from './EditHabitDialog';
import { GridLegend } from './GridLegend';
import { isQuota } from './quota';
import { HabitGrid } from './HabitGrid';
import { useMarkHabit, useMarkSubHabit, useSaveSubHabitNote } from './habitMutations';
import { useHabitOverview } from './habitQueries';
import { habitsGateway, type HabitsGateway } from './habitsGateway';
import { SubHabitsDialog } from './SubHabitsDialog';
import { monthRange, parseMonthParam, toMonthParam } from './months';

type DialogState =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; habitId: string }
  | { kind: 'parts'; habitId: string }
  | { kind: 'day-parts'; habitId: string; date: string }
  | { kind: 'delete'; habit: { id: string; title: string } };

/**
 * The month tracker (DESIGN.md §4.3). One request feeds the whole grid; a tick changes the cell
 * at once and is sent in the background. The month is part of the address (`?month=2026-09`), so
 * a reload and the back button stay where the person was.
 */
export function HabitsPage({ gateway = habitsGateway }: { gateway?: HabitsGateway }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' });
  // Here and not in the grid: a month that is still loading shows a skeleton instead of the grid,
  // so the grid is gone while the person pages through the months - the open habits must not be.
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());

  const now = useToday();
  const today = toApiDate(now);
  const month = parseMonthParam(searchParams.get('month')) ?? startOfMonth(now);

  const overview = useHabitOverview(gateway, { ...monthRange(month), asOf: today });
  const mark = useMarkHabit(gateway);
  const markPart = useMarkSubHabit(gateway);
  const saveNote = useSaveSubHabitNote(gateway);

  function toggleExpanded(habitId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (!next.delete(habitId)) next.add(habitId);
      return next;
    });
  }

  function showMonth(target: Date) {
    // The current month is the default: keep its address clean.
    setSearchParams(isSameMonth(target, now) ? {} : { month: toMonthParam(target) });
  }

  const closeDialog = () => setDialog({ kind: 'none' });

  // The parts' dialogs read their habit from the overview on every render, so a tick or a new part
  // shows in them as soon as it is in the cache; a habit that is gone closes them.
  const dialogHabit =
    dialog.kind === 'parts' || dialog.kind === 'day-parts'
      ? overview.data?.find((habit) => habit.id === dialog.habitId)
      : undefined;

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
          expandedHabitIds={expandedIds}
          onToggleExpanded={(habit) => toggleExpanded(habit.id)}
          onToggle={(habit, date, done) => mark.mutate({ habitId: habit.id, date, done })}
          onTogglePart={(habit, part, date, done) =>
            markPart.mutate({ habitId: habit.id, subHabitId: part.id, date, done })
          }
          onNote={(habit, part, date, text) =>
            saveNote.mutate({ habitId: habit.id, subHabitId: part.id, date, text })
          }
          onDayParts={(habit, date) => setDialog({ kind: 'day-parts', habitId: habit.id, date })}
          onParts={(habit) => setDialog({ kind: 'parts', habitId: habit.id })}
          onEdit={(habit) => setDialog({ kind: 'edit', habitId: habit.id })}
          onDelete={(habit) =>
            setDialog({ kind: 'delete', habit: { id: habit.id, title: habit.title } })
          }
        />
        <GridLegend
          quota={habits.some((habit) => isQuota(habit.recurrence))}
          parts={habits.some((habit) => habit.subHabits.length > 0)}
        />
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
            {/* The same month, as numbers. A link (it opens another screen), icon only on a phone. */}
            <Link
              to={{
                pathname: '/statistics',
                search: isSameMonth(month, now) ? '' : `?month=${toMonthParam(month)}`,
              }}
              className={buttonClassName({
                variant: 'secondary',
                size: 'sm',
                className: 'max-sm:size-9 max-sm:px-0',
              })}
            >
              <ChartNoAxesColumn className="size-5" aria-hidden />
              <span className="max-sm:sr-only">Statistics</span>
            </Link>
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
      <SubHabitsDialog
        gateway={gateway}
        habit={dialog.kind === 'parts' ? (dialogHabit ?? null) : null}
        onClose={closeDialog}
      />
      <DayPartsDialog
        gateway={gateway}
        today={today}
        target={
          dialog.kind === 'day-parts' && dialogHabit
            ? { habit: dialogHabit, date: dialog.date }
            : null
        }
        onClose={closeDialog}
      />
      <DeleteHabitDialog
        gateway={gateway}
        habit={dialog.kind === 'delete' ? dialog.habit : null}
        onClose={closeDialog}
      />
    </>
  );
}
