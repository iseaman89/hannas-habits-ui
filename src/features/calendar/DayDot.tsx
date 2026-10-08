import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { MOODS } from '@/features/diary';
import { cn } from '@/shared/lib/cn';
import { toApiDate } from '@/shared/lib/dates';
import { opensDiary, type DayState } from './dayState';

const MOOD_BY_VALUE = new Map(MOODS.map((mood) => [mood.value, mood]));

/** An entry without a mood: a filled disc with a firm rim - stronger than "no entry", and not one of the mood colours. */
const NO_MOOD_LOOK = 'border-2 border-neutral-500 bg-neutral-200 text-neutral-800';

/** The look of each state (DESIGN.md §4.4). A mood uses its own colour pair from the diary. */
function lookOf(state: DayState): string {
  switch (state.kind) {
    case 'mood':
      return MOOD_BY_VALUE.get(state.mood)?.chosen ?? NO_MOOD_LOOK;
    case 'no-mood':
      return NO_MOOD_LOOK;
    case 'empty':
      return 'border border-neutral-300 text-neutral-700';
    case 'future':
      return 'text-neutral-600';
  }
}

/** What a screen reader hears after the date. */
function describe(state: DayState): string {
  switch (state.kind) {
    case 'mood':
      return `mood ${MOOD_BY_VALUE.get(state.mood)?.label ?? state.mood}`;
    case 'no-mood':
      return 'entry without a mood';
    case 'empty':
    case 'future':
      return 'no entry';
  }
}

interface DayFaceProps {
  state: DayState;
  /** An extra accent ring around the face. */
  today?: boolean;
  /** `day` holds a number (26 px); `swatch` is the legend's small sample. */
  size?: 'day' | 'swatch';
  className?: string;
  children?: ReactNode;
}

/** Just the picture of a day; also the legend's samples. */
export function DayFace({ state, today, size = 'day', className, children }: DayFaceProps) {
  return (
    <span
      aria-hidden={children === undefined ? true : undefined}
      className={cn(
        'grid place-items-center rounded-full text-xs font-bold transition-[filter]',
        size === 'day' ? 'size-6' : 'size-4',
        lookOf(state),
        today && 'ring-2 ring-accent',
        className,
      )}
    >
      {children}
    </span>
  );
}

interface DayDotProps {
  /** Local midnight of the day. */
  date: Date;
  state: DayState;
  isToday: boolean;
  /**
   * Whether this is the one day of its month that Tab stops at. The others are reached with the
   * arrow keys (`MonthCard`), so a year is twelve tab stops and not 365.
   */
  tabStop?: boolean;
}

/**
 * One day of a month. A day that can have a diary is a link to it, named with its date and what
 * it holds ("Wednesday 7 October: mood Great"); a day to come is just its number, which the
 * table's weekday header and month heading already put in context.
 */
export function DayDot({ date, state, isToday, tabStop = true }: DayDotProps) {
  const face = (
    <DayFace
      state={state}
      today={isToday}
      className={opensDiary(state) ? 'group-hover:brightness-90' : undefined}
    >
      {date.getDate()}
    </DayFace>
  );

  if (!opensDiary(state)) return face;

  return (
    <Link
      to={`/diary/${toApiDate(date)}`}
      data-date={toApiDate(date)}
      tabIndex={tabStop ? 0 : -1}
      aria-label={`${format(date, 'EEEE d MMMM')}: ${describe(state)}`}
      aria-current={isToday ? 'date' : undefined}
      className="group inline-grid rounded-full"
    >
      {face}
    </Link>
  );
}
