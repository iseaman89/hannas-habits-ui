import { Flame } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { StreakUnit } from './quota';

interface StreakBadgeProps {
  /** The server's `currentStreak`. */
  days: number;
  /** A quota habit counts weeks or months in a row, not days. */
  unit?: StreakUnit;
}

const SHORT: Record<StreakUnit, string> = { day: '', week: 'wk', month: 'mo' };

function spokenUnit(unit: StreakUnit, count: number): string {
  return unit === 'day' ? '' : ` ${unit}${count === 1 ? '' : 's'}`;
}

/**
 * The flame and the number in a row (the server's `currentStreak`): scheduled days, or - for a
 * quota - weeks or months, which the small "wk" / "mo" says.
 */
export function StreakBadge({ days, unit = 'day' }: StreakBadgeProps) {
  const alive = days > 0;
  return (
    <span
      role="img"
      aria-label={`Current streak: ${days}${spokenUnit(unit, days)}`}
      className={cn(
        'inline-flex items-center gap-1.5 font-display text-lg',
        alive ? 'text-accent-700' : 'text-neutral-600',
      )}
    >
      <Flame aria-hidden className={cn('size-5', alive && 'text-accent')} />
      <span aria-hidden>{days}</span>
      {unit !== 'day' && (
        <span aria-hidden className="-ml-1 font-sans text-xs font-bold">
          {SHORT[unit]}
        </span>
      )}
    </span>
  );
}
