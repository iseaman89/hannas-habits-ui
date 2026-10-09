import { errorMessage } from '@/shared/api';
import { Button, Dialog, FormMessage, Spinner, useToast } from '@/shared/ui';
import { useUpdateHabit } from './habitMutations';
import { useHabitDetails } from './habitQueries';
import { toHabitValues } from './habitSchema';
import type { HabitInput, HabitsGateway } from './habitsGateway';
import { HabitForm } from './HabitForm';

interface EditHabitDialogProps {
  gateway: HabitsGateway;
  /** The habit to edit; `null` = closed. */
  habitId: string | null;
  onClose: () => void;
}

export function EditHabitDialog({ gateway, habitId, onClose }: EditHabitDialogProps) {
  return (
    <Dialog open={habitId !== null} onClose={onClose} title="Edit habit">
      {habitId !== null && (
        <EditHabitContent gateway={gateway} habitId={habitId} onClose={onClose} />
      )}
    </Dialog>
  );
}

/**
 * Loads the habit first: the overview that feeds the grid does not carry the description, and
 * saving writes the whole habit, so a form built from the overview would wipe it.
 */
function EditHabitContent({
  gateway,
  habitId,
  onClose,
}: {
  gateway: HabitsGateway;
  habitId: string;
  onClose: () => void;
}) {
  const habit = useHabitDetails(gateway, habitId);
  const update = useUpdateHabit(gateway);
  const toast = useToast();

  async function submit(input: HabitInput) {
    await update.mutateAsync({ id: habitId, input });
    toast.success('Habit saved');
    onClose();
  }

  if (habit.isPending) {
    return (
      <div className="grid place-items-center py-8 text-2xl text-accent-700">
        <Spinner label="Loading habit" />
      </div>
    );
  }

  if (habit.isError) {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage message={errorMessage(habit.error, 'The habit could not be loaded.')} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => void habit.refetch()}>Try again</Button>
        </div>
      </div>
    );
  }

  return (
    <HabitForm
      initial={toHabitValues(habit.data)}
      submitLabel="Save changes"
      onSubmit={submit}
      onCancel={onClose}
    />
  );
}
