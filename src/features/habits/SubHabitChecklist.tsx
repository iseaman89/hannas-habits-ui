import { cn } from '@/shared/lib/cn';
import { Checkbox } from '@/shared/ui';
import { dueSubHabits, type SubHabit } from './subHabits';

interface SubHabitChecklistProps {
  habit: { title: string; subHabits: readonly SubHabit[] };
  /** The day, `yyyy-MM-dd`: the parts that are due on it are listed. */
  date: string;
  /** The client's local today: a day to come cannot be ticked, only taken back. */
  today: string;
  onToggle: (part: SubHabit, done: boolean) => void;
  className?: string;
}

/**
 * The parts of one habit that are due on one day, each with a box. The same list in the day's
 * dialog and under the habit in the diary's "Today's habits" card. A part that is ticked on a day
 * to come (made elsewhere) can still be taken back.
 */
export function SubHabitChecklist({
  habit,
  date,
  today,
  onToggle,
  className,
}: SubHabitChecklistProps) {
  return (
    <ul className={cn('flex flex-col gap-2', className)}>
      {dueSubHabits(habit, date).map((part) => {
        const done = part.completedDates.includes(date);
        return (
          <li key={part.id} className="flex items-center gap-3">
            <Checkbox
              tone="accent-2"
              label={`${habit.title}: ${part.title}`}
              checked={done}
              disabled={date > today && !done}
              onChange={(checked) => onToggle(part, checked)}
            />
            <span aria-hidden className="min-w-0 flex-1 truncate" title={part.title}>
              {part.title}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
