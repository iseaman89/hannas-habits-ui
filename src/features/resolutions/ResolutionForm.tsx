import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { HabitsGateway } from '@/features/habits';
import { applyServerError } from '@/shared/lib/formErrors';
import { Button, Field, FormMessage, Input } from '@/shared/ui';
import { HabitPicker } from './HabitPicker';
import {
  TITLE_MAX_LENGTH,
  resolutionSchema,
  toResolutionInput,
  type ResolutionValues,
} from './resolutionSchema';
import type { ResolutionInput } from './resolutionsGateway';

interface ResolutionFormProps {
  /** What the fields start with: the saved item. */
  initial: ResolutionValues;
  /** The habit the item is tracked by now, for the picker (see `HabitPicker`). */
  linked: { id: string; title: string } | null;
  habits: HabitsGateway;
  /** Rejects with the `ApiError` of a failed attempt; resolves once the change is saved. */
  onSubmit: (input: ResolutionInput) => Promise<unknown>;
  onCancel: () => void;
}

const FIELDS = ['title', 'habitId'] as const;

/** Title and habit of a resolution (React Hook Form + zod, the pattern of `HabitForm`). */
export function ResolutionForm({
  initial,
  linked,
  habits,
  onSubmit,
  onCancel,
}: ResolutionFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResolutionValues>({
    resolver: zodResolver(resolutionSchema),
    defaultValues: initial,
  });
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const canSubmit = watch('title').trim() !== '';

  const submit = handleSubmit(async (values) => {
    setFormMessage(null);
    try {
      await onSubmit(toResolutionInput(values));
    } catch (error) {
      setFormMessage(applyServerError(error, setError, FIELDS));
    }
  });

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-5">
      <Field label="What do you resolve to do?" error={errors.title?.message}>
        {(control) => <Input maxLength={TITLE_MAX_LENGTH} {...control} {...register('title')} />}
      </Field>

      <Field
        label="Tracked by a habit (optional)"
        hint="The resolution then points to the habit on the Habits screen."
        error={errors.habitId?.message}
      >
        {(control) => (
          <HabitPicker gateway={habits} linked={linked} {...control} {...register('habitId')} />
        )}
      </Field>

      <FormMessage message={formMessage} />

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={!canSubmit}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
