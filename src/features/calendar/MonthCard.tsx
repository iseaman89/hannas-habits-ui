import { useId, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { addDays, format } from 'date-fns';
import { Card } from '@/shared/ui';
import { parseApiDate, toApiDate } from '@/shared/lib/dates';
import { DayDot } from './DayDot';
import { dayToFocus } from './dayKeys';
import { dayState, opensDiary, type Mood } from './dayState';
import { weeksOfMonth } from './monthGrid';

/** Monday to Sunday, any week will do: 1 January 2024 was a Monday. */
const WEEK = Array.from({ length: 7 }, (_, index) => addDays(new Date(2024, 0, 1), index));

interface MonthCardProps {
  /** Any day of the month. */
  month: Date;
  /** The client's today, `yyyy-MM-dd`. */
  today: string;
  /** The days that have an entry and their mood (`null` = none). */
  entries: ReadonlyMap<string, Mood | null>;
  /** The month the person is in right now: its card is set apart. */
  current: boolean;
}

/** "3 entries" - nothing for none. */
function entriesLabel(count: number): string | null {
  if (count === 0) return null;
  return count === 1 ? '1 entry' : `${count} entries`;
}

/**
 * One month: its name, how many days have an entry and the days as a Monday-first table.
 *
 * Keyboard: Tab stops at **one** day of the month (the day last focused; before that today, or
 * the first day) and the arrow keys, Home and End move between the days that can be opened
 * (`dayToFocus`) - a roving tabindex. A year of links would otherwise be up to 365 tab stops.
 */
export function MonthCard({ month, today, entries, current }: MonthCardProps) {
  const headingId = useId();
  const prefix = format(month, 'yyyy-MM');
  const count = [...entries.keys()].filter((date) => date.startsWith(prefix)).length;
  const counted = entriesLabel(count);

  const openable = new Set(
    weeksOfMonth(month)
      .flat()
      .filter((day): day is Date => day !== null)
      .map(toApiDate)
      .filter((date) => opensDiary(dayState(date, today, entries))),
  );
  const [lastFocused, setLastFocused] = useState<string | null>(null);
  const tabStop =
    lastFocused !== null && openable.has(lastFocused)
      ? lastFocused
      : openable.has(today)
        ? today
        : ([...openable][0] ?? null);

  /** The day (`yyyy-MM-dd`) of the link an event came from. */
  const dayOf = (target: EventTarget) =>
    target instanceof Element
      ? (target.closest<HTMLElement>('[data-date]')?.dataset.date ?? null)
      : null;

  function onFocus(event: FocusEvent<HTMLTableElement>) {
    const date = dayOf(event.target);
    if (date) setLastFocused(date);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTableElement>) {
    // Alt+Left is the browser's "back"; a shortcut with a modifier is not ours.
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const from = parseApiDate(dayOf(event.target) ?? '');
    if (!from) return;

    const to = dayToFocus(from, event.key, (day) => openable.has(toApiDate(day)));
    if (!to) return;
    event.preventDefault();
    event.currentTarget.querySelector<HTMLElement>(`[data-date="${toApiDate(to)}"]`)?.focus();
  }

  return (
    <Card tone={current ? 'soft' : 'surface'} className="p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id={headingId} className="font-display text-card">
          {format(month, 'MMMM')}
        </h2>
        {counted && <p className="text-xs font-bold text-neutral-700">{counted}</p>}
      </div>

      <table
        aria-labelledby={headingId}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        className="w-full border-separate border-spacing-0"
      >
        <thead>
          <tr>
            {WEEK.map((day) => (
              <th key={day.getDay()} scope="col" className="pb-1 text-xs text-neutral-700">
                <span aria-hidden>{format(day, 'EEEEE')}</span>
                <span className="sr-only">{format(day, 'EEEE')}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeksOfMonth(month).map((week) => (
            <tr key={week.find((day) => day !== null)?.getDate()}>
              {week.map((day, column) => (
                <td key={column} className="py-0.5 text-center">
                  {day && (
                    <DayDot
                      date={day}
                      state={dayState(toApiDate(day), today, entries)}
                      isToday={toApiDate(day) === today}
                      tabStop={toApiDate(day) === tabStop}
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
