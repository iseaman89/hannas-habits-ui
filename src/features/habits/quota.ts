import type { HabitOverview } from './habitsGateway';
import type { Recurrence } from './recurrence';

/** What a habit's streak counts: days in a row, or - for a quota - weeks or months in a row. */
export type StreakUnit = 'day' | 'week' | 'month';

/**
 * A quota ("3 times a week") has no due day: any day can be ticked, and the question is whether the
 * week - or month - reached its number. The rule of what counts is the server's (`quotaPeriods`,
 * `currentStreak`); this only tells the two kinds of habit apart for showing them.
 */
export function isQuota(recurrence: Pick<Recurrence, 'kind'>): boolean {
  return recurrence.kind === 'timesPerWeek' || recurrence.kind === 'timesPerMonth';
}

export function streakUnit(recurrence: Pick<Recurrence, 'kind'>): StreakUnit {
  switch (recurrence.kind) {
    case 'timesPerWeek':
      return 'week';
    case 'timesPerMonth':
      return 'month';
    default:
      return 'day';
  }
}

/**
 * How far the week or month of `day` has come, for a quota habit: "2 of 3 this week", or "2 of 3
 * in that week" for a day that is not in the current one. `null` for any other rule, and when the
 * overview was asked for a range that does not hold the day's period.
 */
export function quotaProgressText(
  habit: Pick<HabitOverview, 'recurrence' | 'quotaPeriods'>,
  day: string,
  today: string,
): string | null {
  const unit = streakUnit(habit.recurrence);
  const { times } = habit.recurrence;
  if (unit === 'day' || times === null) return null;

  const period = habit.quotaPeriods.find(({ from, to }) => from <= day && day <= to);
  if (!period) return null;

  const when = period.from <= today && today <= period.to ? 'this' : 'in that';
  return `${period.done} of ${times} ${when} ${unit}`;
}
