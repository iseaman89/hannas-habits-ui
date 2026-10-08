import { useState } from 'react';
import { errorMessage } from '@/shared/api';
import { Button, Dialog, FormMessage, useToast } from '@/shared/ui';
import { useDeleteHabit } from './habitMutations';
import type { HabitsGateway } from './habitsGateway';

interface DeleteHabitDialogProps {
  gateway: HabitsGateway;
  /** The habit to delete; `null` = closed. */
  habit: { id: string; title: string } | null;
  onClose: () => void;
}

export function DeleteHabitDialog({ gateway, habit, onClose }: DeleteHabitDialogProps) {
  const remove = useDeleteHabit(gateway);
  const toast = useToast();
  const [message, setMessage] = useState<string | null>(null);

  function close() {
    setMessage(null);
    onClose();
  }

  async function confirm() {
    if (!habit) return;
    setMessage(null);
    try {
      await remove.mutateAsync(habit.id);
      toast.success('Habit deleted');
      close();
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  return (
    <Dialog
      open={habit !== null}
      onClose={close}
      title="Delete this habit?"
      actions={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button loading={remove.isPending} onClick={() => void confirm()}>
            Delete
          </Button>
        </>
      }
    >
      <p>
        “{habit?.title}” and everything you ticked off for it will be gone for good. Resolutions
        that point to it stay, without the link.
      </p>
      <FormMessage message={message} />
    </Dialog>
  );
}
