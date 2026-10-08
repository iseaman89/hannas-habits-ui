import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { applyServerError } from '@/shared/lib/formErrors';
import { Button, Field, FormMessage, Input, Textarea } from '@/shared/ui';
import { habitSchema, toHabitInput, type HabitValues } from './habitSchema';
import type { HabitInput } from './habitsGateway';
import { WeekdayToggle } from './WeekdayToggle';

interface HabitFormProps {
  /** What the fields start with (empty for a new habit, the saved habit for an edit). */
  initial: HabitValues;
  /** "Add habit" / "Save changes"; the form appends how often the habit repeats. */
  submitLabel: string;
  /** Rejects with the `ApiError` of a failed attempt; resolves once the change is saved. */
  onSubmit: (input: HabitInput) => Promise<unknown>;
  onCancel: () => void;
}

const FIELDS = ['title', 'description', 'schedule'] as const;

/** One form for adding and for editing a habit (the old UI had two copies of it). */
export function HabitForm({ initial, submitLabel, onSubmit, onCancel }: HabitFormProps) {
  const {
    register,
    control: formControl,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<HabitValues>({ resolver: zodResolver(habitSchema), defaultValues: initial });
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const title = watch('title');
  const schedule = watch('schedule');
  // The design keeps the button off until there is something to save.
  const canSubmit = title.trim() !== '' && schedule.length > 0;

  const submit = handleSubmit(async (values) => {
    setFormMessage(null);
    try {
      await onSubmit(toHabitInput(values));
    } catch (error) {
      setFormMessage(applyServerError(error, setError, FIELDS));
    }
  });

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-5">
      <Field label="What do you want to do?" error={errors.title?.message}>
        {(control) => (
          <Input placeholder="e.g. Stretch for 10 minutes" {...control} {...register('title')} />
        )}
      </Field>

      <Controller
        name="schedule"
        control={formControl}
        render={({ field }) => (
          <WeekdayToggle
            value={field.value}
            onChange={field.onChange}
            error={errors.schedule?.message}
          />
        )}
      />

      <Field label="Note (optional)" error={errors.description?.message}>
        {(control) => <Textarea rows={3} {...control} {...register('description')} />}
      </Field>

      <FormMessage message={formMessage} />

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={!canSubmit}>
          {submitLabel} · {schedule.length}×/week
        </Button>
      </div>
    </form>
  );
}
