import { useState } from 'react';
import { errorMessage } from '@/shared/api';
import { Button, Dialog, FormMessage, useToast } from '@/shared/ui';
import { useDeleteResolution } from './resolutionMutations';
import type { Resolution, ResolutionsGateway } from './resolutionsGateway';

interface DeleteResolutionDialogProps {
  gateway: ResolutionsGateway;
  year: number;
  /** The item to delete; `null` = closed. */
  item: Resolution | null;
  onClose: () => void;
}

export function DeleteResolutionDialog({
  gateway,
  year,
  item,
  onClose,
}: DeleteResolutionDialogProps) {
  const remove = useDeleteResolution(gateway);
  const toast = useToast();
  const [message, setMessage] = useState<string | null>(null);

  function close() {
    setMessage(null);
    onClose();
  }

  async function confirm() {
    if (!item) return;
    setMessage(null);
    try {
      await remove.mutateAsync({ year, id: item.id });
      toast.success('Resolution deleted');
      close();
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  return (
    <Dialog
      open={item !== null}
      onClose={close}
      title="Delete this resolution?"
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
      <p>“{item?.title}” will be gone for good. The habit it points to stays.</p>
      <FormMessage message={message} />
    </Dialog>
  );
}
