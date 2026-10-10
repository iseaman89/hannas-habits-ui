import { useLayoutEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { toApiDate } from '@/shared/lib/dates';
import { IconButton } from '@/shared/ui';
import type { TagSummary } from '@/features/tags';
import { cellState } from './cells';
import { DayCell } from './DayCell';
import type { HabitOverview } from './habitsGateway';
import { scrollLeftToCenter } from './gridScroll';
import { daysOfMonth } from './months';
import { StreakBadge } from './StreakBadge';
import { TagDot } from './TagDot';
import { isQuota, quotaProgressText, streakUnit } from './quota';
import { recurrenceLabel, toRecurrenceValues } from './recurrence';
import { dayName, type DayOfWeek } from './weekdays';

interface HabitGridProps {
  habits: readonly HabitOverview[];
  /** Any day of the month to show. */
  month: Date;
  /** The client's local today, `yyyy-MM-dd`. */
  today: string;
  /** `done` is what the cell should become. */
  onToggle: (habit: HabitOverview, date: string, done: boolean) => void;
  /** Opens the tags of one day (any day, also one that cannot be ticked). */
  onTags: (habit: HabitOverview, date: string) => void;
  onEdit: (habit: HabitOverview) => void;
  onDelete: (habit: HabitOverview) => void;
}

const stickyCell = 'sticky left-0 z-10 bg-surface';

/**
 * The month as a table (DESIGN.md §4.3): a column per day of *this* month, a row per habit and
 * its streak at the end. A real `<table>`, so a screen reader can read a cell together with its
 * habit and its day; it scrolls sideways on its own and keeps the habit names in view. A month
 * opens scrolled to today (to its start when today is not in it), so that on a phone - where only
 * a few days fit beside the names - the day that matters is the one in view.
 */
export function HabitGrid({
  habits,
  month,
  today,
  onToggle,
  onTags,
  onEdit,
  onDelete,
}: HabitGridProps) {
  const days = daysOfMonth(month);
  const scroller = useRef<HTMLDivElement>(null);
  const monthKey = toApiDate(days[0] ?? month);

  useLayoutEffect(() => {
    const box = scroller.current;
    if (!box) return;

    const todayColumn = box.querySelector<HTMLElement>('th[aria-current="date"]');
    const namesColumn = box.querySelector<HTMLElement>('thead th');
    box.scrollLeft =
      todayColumn && namesColumn
        ? scrollLeftToCenter({
            columnLeft: todayColumn.offsetLeft,
            columnWidth: todayColumn.offsetWidth,
            namesWidth: namesColumn.offsetWidth,
            boxWidth: box.clientWidth,
          })
        : 0;
    // Per month and per day (the page may stay open past midnight), not on every render: the
    // person's own scrolling must not be undone by a tick.
  }, [monthKey, today]);

  // `relative`: the day names for screen readers (`sr-only`, absolutely positioned) must be
  // clipped and scrolled with the table; see AppShell.
  return (
    <div ref={scroller} className="relative overflow-x-auto">
      <table className="w-full min-w-[66rem] border-separate border-spacing-0">
        <caption className="sr-only">Habits in {format(month, 'MMMM yyyy')}</caption>
        <thead>
          <tr>
            <th scope="col" className={cn(stickyCell, 'w-32 min-w-32 sm:w-64 sm:min-w-56')}>
              <span className="sr-only">Habit</span>
            </th>
            {days.map((date) => {
              const isToday = toApiDate(date) === today;
              return (
                <th
                  key={toApiDate(date)}
                  scope="col"
                  aria-current={isToday ? 'date' : undefined}
                  className="px-0.5 pb-3 text-center font-normal"
                >
                  <span
                    aria-hidden
                    className={cn(
                      'mx-auto flex w-8 flex-col items-center rounded-full py-1 text-xs leading-tight',
                      isToday ? 'bg-accent text-bg' : 'text-neutral-700',
                    )}
                  >
                    <span className="font-bold">{dayName(date.getDay() as DayOfWeek).letter}</span>
                    <span>{date.getDate()}</span>
                  </span>
                  <span className="sr-only">{format(date, 'EEEE d MMMM')}</span>
                </th>
              );
            })}
            <th
              scope="col"
              className="pb-3 pl-4 text-right text-xs font-bold uppercase tracking-[0.1em] text-neutral-700"
            >
              Streak
            </th>
          </tr>
        </thead>
        <tbody>
          {habits.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              days={days}
              today={today}
              onToggle={onToggle}
              onTags={onTags}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface HabitRowProps extends Pick<
  HabitGridProps,
  'today' | 'onToggle' | 'onTags' | 'onEdit' | 'onDelete'
> {
  habit: HabitOverview;
  days: readonly Date[];
}

function HabitRow({ habit, days, today, onToggle, onTags, onEdit, onDelete }: HabitRowProps) {
  const done = new Set(habit.completedDates);
  const due = new Set(habit.scheduledDates);
  const tagged = new Map<string, readonly TagSummary[]>(
    habit.taggedDays.map((day) => [day.date, day.tags]),
  );
  const quota = isQuota(habit.recurrence);
  const progress = quotaProgressText(habit, today, today);
  const rule = [recurrenceLabel(toRecurrenceValues(habit.recurrence)), progress]
    .filter(Boolean)
    .join(' · ');

  return (
    <tr className="[&>*]:border-t [&>*]:border-divider">
      <th scope="row" className={cn(stickyCell, 'py-2 pr-4 text-left font-normal')}>
        {/* A phone has no room for the buttons beside the name: they go under it. */}
        <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:gap-1">
          <div className="w-full min-w-0 sm:flex-1">
            <p className="truncate font-bold" title={habit.title}>
              {habit.title}
            </p>
            <p className="truncate text-xs text-neutral-700 sm:text-sm" title={rule}>
              {rule}
            </p>
          </div>
          <div className="flex">
            <IconButton label={`Edit ${habit.title}`} size="sm" onClick={() => onEdit(habit)}>
              <Pencil />
            </IconButton>
            <IconButton label={`Delete ${habit.title}`} size="sm" onClick={() => onDelete(habit)}>
              <Trash2 />
            </IconButton>
          </div>
        </div>
      </th>
      {days.map((date) => {
        const key = toApiDate(date);
        const isDone = done.has(key);
        const state = cellState({
          date,
          today,
          startDate: habit.startDate,
          scheduled: due.has(key),
          done: isDone,
          quota,
        });
        const label = `${habit.title}, ${format(date, 'EEE d MMM')}`;
        return (
          <td key={key} className="group/day relative px-0.5 py-2 text-center">
            <DayCell state={state} label={label} onToggle={() => onToggle(habit, key, !isDone)} />
            <TagDot label={label} tags={tagged.get(key) ?? []} onOpen={() => onTags(habit, key)} />
          </td>
        );
      })}
      <td className="py-2 pl-4 text-right">
        <StreakBadge days={habit.currentStreak} unit={streakUnit(habit.recurrence)} />
      </td>
    </tr>
  );
}
