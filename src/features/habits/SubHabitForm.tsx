import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { applyServerError } from '@/shared/lib/formErrors';
import { Button, Field, FormMessage, Input } from '@/shared/ui';
import type { SubHabitInput } from './habitsGateway';
import { subHabitSchema, toSubHabitInput, type SubHabitValues } from './subHabitSchema';
import { WeekdayToggle } from './WeekdayToggle';
import type { DayOfWeek } from './weekdays';

interface SubHabitFormProps {
  /** What the fields start with (empty for a new part, the saved part for a change). */
  initial: SubHabitValues;
  /** The days a part may be planned on: the habit's own. */
  allowed: readonly DayOfWeek[];
  submitLabel: string;
  /** Rejects with the `ApiError` of a failed attempt; resolves once the part is saved. */
  onSubmit: (input: SubHabitInput) => Promise<unknown>;
  /** Absent while there is nothing to go back to (the habit's first part). */
  onCancel?: () => void;
  /** Takes the focus when it appears: the person asked for this form. */
  autoFocus?: boolean;
}

const FIELDS = ['title', 'weekdays'] as const;

/** One form for adding a part and for changing one. */
export function SubHabitForm({
  initial,
  allowed,
  submitLabel,
  onSubmit,
  onCancel,
  autoFocus = false,
}: SubHabitFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SubHabitValues>({ resolver: zodResolver(subHabitSchema), defaultValues: initial });
  const [message, setMessage] = useState<string | null>(null);

  const submit = handleSubmit(async (values) => {
    setMessage(null);
    try {
      await onSubmit(toSubHabitInput(values));
    } catch (error) {
      // A taken name or a day the habit does not have comes without a field: it is the message.
      setMessage(applyServerError(error, setError, FIELDS));
    }
  });

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      <Field label="Name of the part" error={errors.title?.message}>
        {(field) => (
          <Input
            placeholder="e.g. Legs"
            autoComplete="off"
            autoFocus={autoFocus}
            {...field}
            {...register('title')}
          />
        )}
      </Field>

      <Controller
        name="weekdays"
        control={control}
        render={({ field }) => (
          <WeekdayToggle
            legend="Planned on"
            value={field.value}
            onChange={field.onChange}
            allowed={allowed}
            // A habit with fewer days needs no shortcuts; a daily one is the same picker as a rule.
            presets={allowed.length === 7}
            error={errors.weekdays?.message}
          />
        )}
      />

      <FormMessage message={message} />

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
