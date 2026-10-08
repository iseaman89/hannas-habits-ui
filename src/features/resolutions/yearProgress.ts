import { getDayOfYear, getDaysInYear } from 'date-fns';

export interface YearProgress {
  /** Whether the year is over, under way or still to come, seen from `today`. */
  phase: 'past' | 'current' | 'future';
  /**
   * 0-100: how much of the year is behind the person. Today counts as behind - day 280 of 365 is
   * 77 % with 85 days left, the numbers of the design's mockup.
   */
  percent: number;
  /** Days after today until the year is over; `null` unless the year is under way. */
  daysLeft: number | null;
}

/** How far `year` has come, in the client's calendar: `today` is a local date, not a UTC instant. */
export function yearProgress(year: number, today: Date): YearProgress {
  const thisYear = today.getFullYear();
  if (year < thisYear) return { phase: 'past', percent: 100, daysLeft: null };
  if (year > thisYear) return { phase: 'future', percent: 0, daysLeft: null };

  const total = getDaysInYear(today);
  const behind = getDayOfYear(today);
  return { phase: 'current', percent: (behind / total) * 100, daysLeft: total - behind };
}

export interface YearSummary {
  /** The sentence under the donut's percentage ("of 2026 is behind you"). */
  caption: string;
  /** "3 of 5 resolutions kept so far — 85 days left." */
  summary: string;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** The two lines of the progress card, from the year, how far it has come and what is kept. */
export function describeYear(
  year: number,
  progress: YearProgress,
  kept: number,
  total: number,
): YearSummary {
  const caption =
    progress.phase === 'future' ? `${year} has not begun yet` : `of ${year} is behind you`;

  const count =
    total === 0
      ? 'No resolutions yet'
      : `${kept} of ${plural(total, 'resolution', 'resolutions')} kept`;
  if (progress.phase !== 'current') return { caption, summary: `${count}.` };

  const left = progress.daysLeft ?? 0;
  const rest = left === 0 ? 'this is the last day' : `${plural(left, 'day', 'days')} left`;
  return { caption, summary: `${count}${total === 0 ? '' : ' so far'} — ${rest}.` };
}
