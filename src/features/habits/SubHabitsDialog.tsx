import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { errorMessage } from '@/shared/api';
import { Button, Dialog, FormMessage, IconButton, useToast } from '@/shared/ui';
import { useAddSubHabit, useRemoveSubHabit, useUpdateSubHabit } from './habitMutations';
import type { HabitOverview, HabitsGateway, SubHabitInput } from './habitsGateway';
import { SubHabitForm } from './SubHabitForm';
import { emptySubHabit, toSubHabitValues } from './subHabitSchema';
import { MAX_SUB_HABITS, habitWeekdays, partsLabel, strandedWeekdays } from './subHabits';
import { dayName, scheduleLabel, type DayOfWeek } from './weekdays';

/** What the dialog needs of a habit; read from the overview, so a change shows when it is in. */
export type PartsOwner = Pick<HabitOverview, 'id' | 'title' | 'recurrence' | 'subHabits'>;

interface SubHabitsDialogProps {
  gateway: HabitsGateway;
  /** The habit whose parts are managed; `null` = closed. */
  habit: PartsOwner | null;
  onClose: () => void;
}

/**
 * Add, change and remove the parts of a habit. Every step is saved at once (a part is not part of
 * the habit's own form, which has its own Save): that is why it is a dialog of its own. The days a
 * part can be planned on are the habit's, as the server checks them.
 */
export function SubHabitsDialog({ gateway, habit, onClose }: SubHabitsDialogProps) {
  return (
    <Dialog
      open={habit !== null}
      onClose={onClose}
      title={habit ? `Parts of ${habit.title}` : 'Parts'}
      actions={<Button onClick={onClose}>Done</Button>}
    >
      {habit && <SubHabitsContent gateway={gateway} habit={habit} />}
    </Dialog>
  );
}

function SubHabitsContent({ gateway, habit }: { gateway: HabitsGateway; habit: PartsOwner }) {
  const allowed = habitWeekdays(habit.recurrence);
  const [adding, setAdding] = useState(false);
  const add = useAddSubHabit(gateway);

  const parts = habit.subHabits;
  const full = parts.length >= MAX_SUB_HABITS;
  // A habit without parts opens straight on the form: there is nothing else to do here.
  const showForm = !full && (adding || parts.length === 0);

  async function create(input: SubHabitInput) {
    await add.mutateAsync({ habitId: habit.id, input });
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="-mt-2 text-sm text-neutral-700">
        A part is something you do on some of this habit’s days, like legs on Monday and arms on
        Thursday. A day counts as done when all the parts planned for it are. Changes here are saved
        at once.
      </p>

      {parts.length > 0 && (
        <section aria-label="Parts" className="flex flex-col gap-1">
          <p className="text-sm font-bold text-neutral-700">{partsLabel(parts.length)}</p>
          <ul className="max-h-[40vh] overflow-y-auto">
            {parts.map((part) => (
              <PartRow
                key={part.id}
                habitId={habit.id}
                part={part}
                allowed={allowed}
                gateway={gateway}
              />
            ))}
          </ul>
        </section>
      )}

      {showForm && (
        <SubHabitForm
          // A fresh form after every add (the key changes with the number of parts).
          key={parts.length}
          initial={emptySubHabit(allowed)}
          allowed={allowed}
          submitLabel="Add part"
          onSubmit={create}
          onCancel={parts.length > 0 ? () => setAdding(false) : undefined}
          autoFocus={adding}
        />
      )}

      {!showForm && !full && (
        <div>
          <Button variant="secondary" onClick={() => setAdding(true)}>
            <Plus className="size-5" aria-hidden />
            Add a part
          </Button>
        </div>
      )}

      {full && (
        <p className="rounded-md bg-neutral-100 px-4 py-3 text-sm text-neutral-800">
          A habit can have at most {MAX_SUB_HABITS} parts. Remove one to add another.
        </p>
      )}
    </div>
  );
}

type RowMode = 'view' | 'edit' | 'remove';

interface PartRowProps {
  habitId: string;
  part: PartsOwner['subHabits'][number];
  allowed: readonly DayOfWeek[];
  gateway: HabitsGateway;
}

const spoken = (days: readonly DayOfWeek[]) => days.map((day) => dayName(day).short).join(', ');

function PartRow({ habitId, part, allowed, gateway }: PartRowProps) {
  const [mode, setMode] = useState<RowMode>('view');
  const [message, setMessage] = useState<string | null>(null);
  const update = useUpdateSubHabit(gateway);
  const remove = useRemoveSubHabit(gateway);
  const toast = useToast();

  // Days the part has but the habit does not (any more): the rule of the habit was changed
  // after the part was planned. They are never due, and the person should know.
  const stranded = strandedWeekdays(part, allowed);
  const neverDue = stranded.length === part.weekdays.length;

  function show(next: RowMode) {
    setMessage(null);
    setMode(next);
  }

  async function save(input: SubHabitInput) {
    await update.mutateAsync({ habitId, subHabitId: part.id, input });
    setMode('view');
  }

  async function confirmRemove() {
    setMessage(null);
    try {
      await remove.mutateAsync({ habitId, subHabitId: part.id });
      toast.success(`“${part.title}” removed.`);
    } catch (error) {
      setMessage(errorMessage(error, 'The part could not be removed.'));
    }
  }

  return (
    <li className="flex flex-col gap-2 border-t border-divider py-3 first:border-t-0">
      {mode === 'view' && (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold" title={part.title}>
              {part.title}
            </p>
            <p className="text-sm text-neutral-700">{scheduleLabel(part.weekdays)}</p>
            {stranded.length > 0 && (
              <p className="text-sm font-semibold text-accent-700">
                {neverDue
                  ? `Never due: the habit is not planned on ${spoken(stranded)} any more.`
                  : `Not due on ${spoken(stranded)}: the habit is not planned on ${
                      stranded.length === 1 ? 'that day' : 'those days'
                    } any more.`}
              </p>
            )}
          </div>
          <IconButton label={`Change ${part.title}`} size="sm" onClick={() => show('edit')}>
            <Pencil />
          </IconButton>
          <IconButton label={`Remove ${part.title}`} size="sm" onClick={() => show('remove')}>
            <Trash2 />
          </IconButton>
        </div>
      )}

      {mode === 'edit' && (
        <SubHabitForm
          initial={toSubHabitValues(part)}
          allowed={allowed}
          submitLabel="Save"
          onSubmit={save}
          onCancel={() => show('view')}
          autoFocus
        />
      )}

      {mode === 'remove' && (
        <div className="flex flex-col gap-2">
          <p>
            Remove “{part.title}”? Its ticks go with it; the days of the habit itself stay as they
            are.
          </p>
          <div className="flex gap-2">
            <Button size="sm" loading={remove.isPending} onClick={() => void confirmRemove()}>
              Remove
            </Button>
            <Button size="sm" variant="ghost" onClick={() => show('view')}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <FormMessage message={message} />
    </li>
  );
}
