import type { DiaryDay } from '@/features/diary';

export type Mood = NonNullable<DiaryDay['mood']>;

/**
 * What a day of the calendar is (DESIGN.md §4.4).
 * - `mood`: there is an entry with a mood; the day takes the mood's colour.
 * - `no-mood`: there is an entry, but only a highlight or a list (the mood is optional).
 * - `empty`: today or a day gone by with no entry - one can still be written.
 * - `future`: a day that has not begun and has no entry.
 */
export type DayState =
  { kind: 'mood'; mood: Mood } | { kind: 'no-mood' } | { kind: 'empty' } | { kind: 'future' };

/**
 * The state of `date`. `entries` maps the days that have an entry to their mood (`null` = no
 * mood). Dates are `yyyy-MM-dd` and compare as text. An entry decides before the date does: a
 * day to come that has an entry (reachable by address) is shown as what it holds.
 */
export function dayState(
  date: string,
  today: string,
  entries: ReadonlyMap<string, Mood | null>,
): DayState {
  const entry = entries.get(date);
  if (entry !== undefined)
    return entry === null ? { kind: 'no-mood' } : { kind: 'mood', mood: entry };
  return date > today ? { kind: 'future' } : { kind: 'empty' };
}

/** Whether the day leads to its diary page. A day that has not begun and has nothing in it does not (the diary's "next day" stops at today too). */
export function opensDiary(state: DayState): boolean {
  return state.kind !== 'future';
}
