import { toApiDate } from '@/shared/lib/dates';
import { Dialog, useToast } from '@/shared/ui';
import { useCreateHabit } from './habitMutations';
import { emptyHabit } from './habitSchema';
import type { HabitInput, HabitsGateway } from './habitsGateway';
import { HabitForm } from './HabitForm';

interface CreateHabitDialogProps {
  gateway: HabitsGateway;
  open: boolean;
  onClose: () => void;
}

export function CreateHabitDialog({ gateway, open, onClose }: CreateHabitDialogProps) {
  const create = useCreateHabit(gateway);
  const toast = useToast();

  async function submit(input: HabitInput) {
    await create.mutateAsync(input);
    toast.success('Habit added');
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="New habit">
      <HabitForm
        // The dialog's content mounts when it opens, so "today" is the day it was opened on.
        initial={emptyHabit(toApiDate(new Date()))}
        submitLabel="Add habit"
        onSubmit={submit}
        onCancel={onClose}
      />
    </Dialog>
  );
}
