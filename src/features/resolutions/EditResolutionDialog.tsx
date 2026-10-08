import type { HabitsGateway } from '@/features/habits';
import { Dialog, useToast } from '@/shared/ui';
import { useUpdateResolution } from './resolutionMutations';
import { toResolutionValues } from './resolutionSchema';
import type { Resolution, ResolutionInput, ResolutionsGateway } from './resolutionsGateway';
import { ResolutionForm } from './ResolutionForm';

interface EditResolutionDialogProps {
  gateway: ResolutionsGateway;
  habits: HabitsGateway;
  year: number;
  /** The item to edit, as the list has it now; `null` = closed (also when it was removed meanwhile). */
  item: Resolution | null;
  onClose: () => void;
}

export function EditResolutionDialog({
  gateway,
  habits,
  year,
  item,
  onClose,
}: EditResolutionDialogProps) {
  return (
    <Dialog open={item !== null} onClose={onClose} title="Edit resolution">
      {item !== null && (
        <EditResolutionContent
          gateway={gateway}
          habits={habits}
          year={year}
          item={item}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}

function EditResolutionContent({
  gateway,
  habits,
  year,
  item,
  onClose,
}: Omit<EditResolutionDialogProps, 'item'> & { item: Resolution }) {
  const update = useUpdateResolution(gateway);
  const toast = useToast();

  async function submit(input: ResolutionInput) {
    // `kept` is not on the form but the server replaces the whole item: it goes along as it is
    // *now* (a click on "Mark kept" a moment ago is already in the list), never as it was.
    await update.mutateAsync({ year, id: item.id, change: { ...input, kept: item.kept } });
    toast.success('Resolution saved');
    onClose();
  }

  return (
    <ResolutionForm
      initial={toResolutionValues(item)}
      linked={
        item.habitId !== null && item.habitTitle !== null
          ? { id: item.habitId, title: item.habitTitle }
          : null
      }
      habits={habits}
      onSubmit={submit}
      onCancel={onClose}
    />
  );
}
