import { toApiDate } from '@/shared/lib/dates';
import { Dialog, useToast } from '@/shared/ui';
import { useCreateHabit } from './habitMutations';
import { EMPTY_HABIT } from './habitSchema';
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
    // The habit counts from the person's today. The server's own date could be a day off.
    await create.mutateAsync({ ...input, startDate: toApiDate(new Date()) });
    toast.success('Habit added');
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="New habit">
      <HabitForm
        initial={EMPTY_HABIT}
        submitLabel="Add habit"
        onSubmit={submit}
        onCancel={onClose}
      />
    </Dialog>
  );
}
