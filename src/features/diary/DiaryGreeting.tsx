import { useUser } from '@/features/auth';
import { toApiDate } from '@/shared/lib/dates';
import { cn } from '@/shared/lib/cn';
import { useToday } from '@/shared/lib/useToday';

interface DiaryGreetingProps {
  /** The day being shown (local midnight). */
  day: Date;
  className?: string;
}

/**
 * "Hi, Hanna" and the question the mood card beside it answers. On another day than today the
 * question is put in the past: "how are you feeling today?" would be asked about a day that is
 * over (or has not begun).
 */
export function DiaryGreeting({ day, className }: DiaryGreetingProps) {
  const { displayName } = useUser();
  const today = useToday();
  const name = displayName.trim();
  const isToday = toApiDate(day) === toApiDate(today);

  return (
    <div className={cn('min-w-0', className)}>
      <p className="font-display text-dialog">{name ? `Hi, ${name}` : 'Hi'}</p>
      <p className="mt-1 text-neutral-700">
        {isToday ? 'How are you feeling today?' : 'How were you feeling on this day?'}
      </p>
    </div>
  );
}
