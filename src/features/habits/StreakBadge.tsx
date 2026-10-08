import { Flame } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/** The flame and the number of scheduled days in a row (the server's `currentStreak`). */
export function StreakBadge({ days }: { days: number }) {
  const alive = days > 0;
  return (
    <span
      role="img"
      aria-label={`Current streak: ${days}`}
      className={cn(
        'inline-flex items-center gap-1.5 font-display text-lg',
        alive ? 'text-accent-700' : 'text-neutral-600',
      )}
    >
      <Flame aria-hidden className={cn('size-5', alive && 'text-accent')} />
      <span aria-hidden>{days}</span>
    </span>
  );
}
