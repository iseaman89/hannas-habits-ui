import { forwardRef, type SelectHTMLAttributes } from 'react';
import { useHabitList, type HabitsGateway } from '@/features/habits';
import { errorMessage } from '@/shared/api';
import { Button, Select } from '@/shared/ui';

interface HabitPickerProps extends SelectHTMLAttributes<HTMLSelectElement> {
  gateway: HabitsGateway;
  /**
   * The habit the item is tracked by now. It is always an option, even before the list has
   * arrived or when the list does not have it: a form that starts on a link must not silently show
   * "No habit" (and then drop the link on save).
   */
  linked: { id: string; title: string } | null;
}

/**
 * The select of the habits a resolution can be tracked by, with "No habit" first. It is a select
 * of its own so the form stays about the form: it asks for the habits itself, tells while they
 * load and when they cannot be loaded (the rest of the form still works then), and takes the
 * `Field` wiring and React Hook Form's `register` like any input.
 */
export const HabitPicker = forwardRef<HTMLSelectElement, HabitPickerProps>(function HabitPicker(
  { gateway, linked, ...selectProps },
  ref,
) {
  const habits = useHabitList(gateway);

  const options = (habits.data ?? []).map(({ id, title }) => ({ id, title }));
  if (linked && !options.some((option) => option.id === linked.id)) options.unshift(linked);

  return (
    <div className="flex flex-col gap-2">
      <Select ref={ref} {...selectProps}>
        <option value="">No habit</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.title}
          </option>
        ))}
      </Select>

      {habits.isPending && <p className="px-3 text-sm text-neutral-700">Loading your habits…</p>}
      {habits.isError && habits.data === undefined && (
        <div className="flex flex-wrap items-center gap-2 px-3 text-sm">
          <p className="text-accent-700">
            {errorMessage(habits.error, 'The habits could not be loaded.')}
          </p>
          <Button variant="ghost" size="sm" onClick={() => void habits.refetch()}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
});
