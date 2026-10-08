import { eachDayOfInterval, endOfMonth, format, isValid, parse, startOfMonth } from 'date-fns';
import { toApiDate } from '@/shared/lib/dates';

const MONTH_PARAM_FORMAT = 'yyyy-MM';

/** The month in the address (`/habits?month=2026-10`). */
export function toMonthParam(month: Date): string {
  return format(month, MONTH_PARAM_FORMAT);
}

/**
 * The first day of the month a `yyyy-MM` string names; `null` for anything else (a missing or
 * hand-edited address falls back to the current month). Only the canonical spelling is accepted.
 */
export function parseMonthParam(value: string | null): Date | null {
  if (value === null) return null;
  const parsed = parse(value, MONTH_PARAM_FORMAT, new Date());
  return isValid(parsed) && toMonthParam(parsed) === value ? startOfMonth(parsed) : null;
}

/** Every day of the month, so a February has 28 or 29 columns and not a fixed 31. */
export function daysOfMonth(month: Date): Date[] {
  return eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
}

/** The first and last day of the month as the overview query wants them. */
export function monthRange(month: Date): { from: string; to: string } {
  return { from: toApiDate(startOfMonth(month)), to: toApiDate(endOfMonth(month)) };
}
