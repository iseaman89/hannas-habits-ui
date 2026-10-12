import { format } from 'date-fns';
import { parseApiDate } from '@/shared/lib/dates';
import { Button, Dialog } from '@/shared/ui';
import { useMarkSubHabit } from './habitMutations';
import type { HabitOverview, HabitsGateway } from './habitsGateway';
import { SubHabitChecklist } from './SubHabitChecklist';
import { subHabitProgress } from './subHabits';

export interface DayPartsTarget {
  /** Read from the overview on every render, so a tick shows in the dialog at once. */
  habit: Pick<HabitOverview, 'id' | 'title' | 'subHabits'>;
  /** `yyyy-MM-dd` */
  date: string;
}

interface DayPartsDialogProps {
  gateway: HabitsGateway;
  /** The client's local today, `yyyy-MM-dd`. */
  today: string;
  /** The day to look at; `null` = closed. */
  target: DayPartsTarget | null;
  onClose: () => void;
}

/**
 * The parts of one habit's day, to tick one by one (the cell of the grid ticks all of them at
 * once). A modal dialog like the one the tags had: focus, touch and a phone-friendly shape are
 * the platform's job, and the table behind scrolls sideways.
 */
export function DayPartsDialog({ gateway, today, target, onClose }: DayPartsDialogProps) {
  const day = target ? parseApiDate(target.date) : null;
  return (
    <Dialog
      open={target !== null}
      onClose={onClose}
      title={day ? `Parts for ${format(day, 'EEEE d MMMM')}` : 'Parts'}
      actions={<Button onClick={onClose}>Done</Button>}
    >
      {target && <DayPartsContent gateway={gateway} today={today} target={target} />}
    </Dialog>
  );
}

function DayPartsContent({
  gateway,
  today,
  target,
}: Pick<DayPartsDialogProps, 'gateway' | 'today'> & { target: DayPartsTarget }) {
  const { habit, date } = target;
  const mark = useMarkSubHabit(gateway);
  const progress = subHabitProgress(habit, date);

  return (
    <div className="flex flex-col gap-4">
      <p className="-mt-2 text-neutral-700">{habit.title}</p>

      {progress === null ? (
        <p className="text-neutral-800">No part of this habit is planned for this day.</p>
      ) : (
        <>
          <SubHabitChecklist
            habit={habit}
            date={date}
            today={today}
            onToggle={(part, done) =>
              mark.mutate({ habitId: habit.id, subHabitId: part.id, date, done })
            }
          />
          <p className="text-sm text-neutral-700">
            {date > today
              ? 'This day has not come yet, so its parts cannot be ticked.'
              : 'The day counts as done when all of its parts are.'}
          </p>
        </>
      )}
    </div>
  );
}
