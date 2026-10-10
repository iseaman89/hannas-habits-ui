import type { DayOfWeek } from '@/features/habits/weekdays';
import type { Schema } from '@/shared/api';

/** The rule as the server answers with it: `recurrence` of a habit. */
export type Recurrence = Schema<'RecurrenceDto'>;

/** "On these weekdays, every week" - what every habit was before the recurrence rules (B13). */
export function weeklyRecurrence(weekdays: readonly DayOfWeek[]): Recurrence {
  return {
    kind: 'weekly',
    weekdays: [...weekdays],
    interval: 1,
    anchor: null,
    occurrence: null,
    weekday: null,
    dayOfMonth: null,
  };
}
