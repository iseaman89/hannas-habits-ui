import { cn } from '@/shared/lib/cn';
import type { SubHabitProgress } from './subHabits';

interface PartsButtonProps {
  /** Names the day for a screen reader, e.g. "Sport, Wed 7 Oct". */
  label: string;
  progress: SubHabitProgress;
  onOpen: () => void;
}

/**
 * "1/2" under a day's cell: how many of the day's due parts are done. It opens the day's parts to
 * tick them one by one. The cell itself stays "tick the whole day" (which ticks every due part),
 * so the two are separate controls.
 */
export function PartsButton({ label, progress, onOpen }: PartsButtonProps) {
  const complete = progress.done === progress.due;

  return (
    <button
      type="button"
      aria-label={`Parts, ${label}: ${progress.done} of ${progress.due} done`}
      title={`${progress.done} of ${progress.due} parts done`}
      onClick={onOpen}
      className={cn(
        'mx-auto mt-1 block min-w-8 cursor-pointer whitespace-nowrap rounded-full px-1',
        'text-xs font-bold leading-5 tabular-nums hover:bg-neutral-200',
        complete ? 'text-accent-2-800' : 'text-neutral-700',
      )}
    >
      {progress.done}/{progress.due}
    </button>
  );
}
