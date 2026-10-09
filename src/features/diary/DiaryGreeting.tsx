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
 * "Hi, Hanna! How are you feeling today?" - one sentence, the question the mood faces beside or
 * under it answer. On another day than today the question is put in the past: "how are you
 * feeling today?" would be asked about a day that is over (or has not begun).
 */
export function DiaryGreeting({ day, className }: DiaryGreetingProps) {
  const { firstName } = useUser();
  const today = useToday();
  const name = firstName.trim();
  const isToday = toApiDate(day) === toApiDate(today);

  const hello = name ? `Hi, ${name}!` : 'Hi!';
  const question = isToday ? 'How are you feeling today?' : 'How were you feeling on this day?';

  return (
    <p
      className={cn(
        'min-w-0 font-display text-[1.25rem] leading-snug @lg:text-[1.625rem]',
        className,
      )}
    >
      {`${hello} ${question}`}
    </p>
  );
}
