import { useLayoutEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, ListChecks, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { toApiDate } from '@/shared/lib/dates';
import { IconButton } from '@/shared/ui';
import { cellState } from './cells';
import { DayCell } from './DayCell';
import type { HabitOverview } from './habitsGateway';
import { scrollLeftToCenter } from './gridScroll';
import { daysOfMonth } from './months';
import { PartsButton } from './PartsButton';
import { StreakBadge } from './StreakBadge';
import { isQuota, quotaProgressText, streakUnit } from './quota';
import { recurrenceText } from './recurrence';
import { partsLabel, subHabitProgress, type SubHabit } from './subHabits';
import { dayName, scheduleLabel, type DayOfWeek } from './weekdays';

interface HabitGridProps {
  habits: readonly HabitOverview[];
  /** Any day of the month to show. */
  month: Date;
  /** The client's local today, `yyyy-MM-dd`. */
  today: string;
  /** The habits whose parts are shown as rows of their own under the habit. */
  expandedHabitIds: ReadonlySet<string>;
  onToggleExpanded: (habit: HabitOverview) => void;
  /** `done` is what the cell should become. */
  onToggle: (habit: HabitOverview, date: string, done: boolean) => void;
  /** The same for the cell of one part, in the part's own row. */
  onTogglePart: (habit: HabitOverview, part: SubHabit, date: string, done: boolean) => void;
  /** Opens the parts a habit has on one day, to tick them one by one. */
  onDayParts: (habit: HabitOverview, date: string) => void;
  /** Opens the habit's parts to add, change and remove them. */
  onParts: (habit: HabitOverview) => void;
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
  expandedHabitIds,
  onToggleExpanded,
  onToggle,
  onTogglePart,
  onDayParts,
  onParts,
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
              expanded={expandedHabitIds.has(habit.id)}
              onToggleExpanded={onToggleExpanded}
              onToggle={onToggle}
              onTogglePart={onTogglePart}
              onDayParts={onDayParts}
              onParts={onParts}
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
  | 'today'
  | 'onToggleExpanded'
  | 'onToggle'
  | 'onTogglePart'
  | 'onDayParts'
  | 'onParts'
  | 'onEdit'
  | 'onDelete'
> {
  habit: HabitOverview;
  days: readonly Date[];
  expanded: boolean;
}

function HabitRow({
  habit,
  days,
  today,
  expanded,
  onToggleExpanded,
  onToggle,
  onTogglePart,
  onDayParts,
  onParts,
  onEdit,
  onDelete,
}: HabitRowProps) {
  const hasParts = habit.subHabits.length > 0;
  // A habit that lost its last part while open has nothing to show; it opens again with a new one.
  const open = expanded && hasParts;
  // Four buttons do not fit beside each other in the narrow names column of a phone.
  const buttonSize = hasParts ? 'max-sm:size-7' : undefined;
  const done = new Set(habit.completedDates);
  const due = new Set(habit.scheduledDates);
  const quota = isQuota(habit.recurrence);
  const quotaProgress = quotaProgressText(habit, today, today);
  const parts = habit.subHabits.length > 0 ? partsLabel(habit.subHabits.length) : null;
  const rule = [recurrenceText(habit.recurrence), quotaProgress, parts].filter(Boolean).join(' · ');

  return (
    <>
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
              {hasParts && (
                <IconButton
                  label={`${open ? 'Hide' : 'Show'} parts of ${habit.title}`}
                  size="sm"
                  aria-expanded={open}
                  className={buttonSize}
                  onClick={() => onToggleExpanded(habit)}
                >
                  {open ? <ChevronDown /> : <ChevronRight />}
                </IconButton>
              )}
              <IconButton
                label={`Parts of ${habit.title}`}
                size="sm"
                className={buttonSize}
                onClick={() => onParts(habit)}
              >
                <ListChecks />
              </IconButton>
              <IconButton
                label={`Edit ${habit.title}`}
                size="sm"
                className={buttonSize}
                onClick={() => onEdit(habit)}
              >
                <Pencil />
              </IconButton>
              <IconButton
                label={`Delete ${habit.title}`}
                size="sm"
                className={buttonSize}
                onClick={() => onDelete(habit)}
              >
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
          // Open, the parts have rows of their own: the summary under the cell would say it twice.
          const progress = open ? null : subHabitProgress(habit, key);
          return (
            <td key={key} className="px-0.5 py-2 text-center align-top">
              <DayCell state={state} label={label} onToggle={() => onToggle(habit, key, !isDone)} />
              {progress && (
                <PartsButton
                  label={label}
                  progress={progress}
                  onOpen={() => onDayParts(habit, key)}
                />
              )}
            </td>
          );
        })}
        <td className="py-2 pl-4 text-right">
          <StreakBadge days={habit.currentStreak} unit={streakUnit(habit.recurrence)} />
        </td>
      </tr>
      {open &&
        habit.subHabits.map((part) => (
          <PartRow
            key={part.id}
            habit={habit}
            part={part}
            days={days}
            today={today}
            onToggle={onTogglePart}
          />
        ))}
    </>
  );
}

interface PartRowProps {
  habit: HabitOverview;
  part: SubHabit;
  days: readonly Date[];
  today: string;
  onToggle: HabitGridProps['onTogglePart'];
}

/**
 * One part of an open habit: its own days (the server's `scheduledDates` for the part - the
 * habit's rule *and* the part's weekdays) and a cell to tick that day of the part alone. No
 * streak: that number is the habit's, and a part's lives on the statistics screen.
 */
function PartRow({ habit, part, days, today, onToggle }: PartRowProps) {
  const done = new Set(part.completedDates);
  const due = new Set(part.scheduledDates);

  return (
    <tr>
      <th scope="row" className={cn(stickyCell, 'py-1 pl-4 pr-4 text-left font-normal')}>
        <p className="truncate text-sm font-bold" title={part.title}>
          {part.title}
        </p>
        {/* The names column says which habit the row belongs to; to a screen reader only. */}
        <p className="sr-only">of {habit.title}</p>
        <p className="truncate text-xs text-neutral-700">{scheduleLabel(part.weekdays)}</p>
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
        });
        const label = `${habit.title}: ${part.title}, ${format(date, 'EEE d MMM')}`;
        return (
          <td key={key} className="px-0.5 py-1 text-center align-top">
            <DayCell
              state={state}
              label={label}
              onToggle={() => onToggle(habit, part, key, !isDone)}
            />
          </td>
        );
      })}
      <td />
    </tr>
  );
}
