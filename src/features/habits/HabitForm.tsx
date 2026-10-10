import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { applyServerError } from '@/shared/lib/formErrors';
import { Button, Field, FormMessage, Input, Textarea } from '@/shared/ui';
import {
  START_DATE_MAX,
  START_DATE_MIN,
  habitSchema,
  toHabitInput,
  type HabitValues,
} from './habitSchema';
import type { HabitInput } from './habitsGateway';
import { sameRecurrence } from './recurrence';
import { recurrenceSchema } from './recurrenceSchema';
import { RecurrencePicker } from './RecurrencePicker';

interface HabitFormProps {
  /** What the fields start with (empty for a new habit, the saved habit for an edit). */
  initial: HabitValues;
  /** "Add habit" / "Save changes"; the form appends how often the habit repeats. */
  submitLabel: string;
  /** Rejects with the `ApiError` of a failed attempt; resolves once the change is saved. */
  onSubmit: (input: HabitInput) => Promise<unknown>;
  onCancel: () => void;
  /**
   * The habit exists already: a different rule then also applies to the days that have passed
   * (the rule has no history, DESIGN.md §9), and the form says so when the rule is changed.
   */
  editing?: boolean;
}

const FIELDS = [
  'title',
  'description',
  'startDate',
  'recurrence.kind',
  'recurrence.weekdays',
  'recurrence.everyWeeks',
  'recurrence.everyDays',
  'recurrence.anchor',
  'recurrence.occurrence',
  'recurrence.weekday',
  'recurrence.dayOfMonth',
] as const;

/** One form for adding and for editing a habit (the old UI had two copies of it). */
export function HabitForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  editing = false,
}: HabitFormProps) {
  const {
    register,
    control: formControl,
    handleSubmit,
    setError,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<HabitValues>({ resolver: zodResolver(habitSchema), defaultValues: initial });
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const title = watch('title');
  const startDate = watch('startDate');
  const rule = watch('recurrence');
  const ruleIsValid = recurrenceSchema.safeParse(rule).success;
  // The design keeps the button off until there is something to save.
  const canSubmit = title.trim() !== '' && !(rule.kind === 'weekly' && rule.weekdays.length === 0);
  // "3×/week" is only true of a rule that repeats every week.
  const perWeek =
    rule.kind === 'weekly' && rule.everyWeeks === 1 ? ` · ${rule.weekdays.length}×/week` : '';
  const ruleChanged = editing && ruleIsValid && !sameRecurrence(initial.recurrence, rule);

  const submit = handleSubmit(async (values) => {
    setFormMessage(null);
    try {
      await onSubmit(toHabitInput(values));
    } catch (error) {
      // The server has one `interval`; on screen it is the weeks or the days, whichever is chosen.
      const interval =
        getValues('recurrence.kind') === 'everyNDays'
          ? 'recurrence.everyDays'
          : 'recurrence.everyWeeks';
      setFormMessage(
        applyServerError(error, setError, FIELDS, { 'recurrence.interval': interval }),
      );
    }
  });

  const ruleErrors = errors.recurrence;

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-5">
      <Field label="What do you want to do?" error={errors.title?.message}>
        {(control) => (
          <Input placeholder="e.g. Stretch for 10 minutes" {...control} {...register('title')} />
        )}
      </Field>

      <Controller
        name="recurrence"
        control={formControl}
        render={({ field }) => (
          <RecurrencePicker
            value={field.value}
            onChange={field.onChange}
            startDate={startDate}
            summarize={ruleIsValid}
            errors={{
              kind: ruleErrors?.kind?.message,
              weekdays: ruleErrors?.weekdays?.message,
              everyWeeks: ruleErrors?.everyWeeks?.message,
              everyDays: ruleErrors?.everyDays?.message,
              anchor: ruleErrors?.anchor?.message,
              occurrence: ruleErrors?.occurrence?.message,
              weekday: ruleErrors?.weekday?.message,
              dayOfMonth: ruleErrors?.dayOfMonth?.message,
            }}
          />
        )}
      />

      {ruleChanged && (
        <p className="-mt-2 px-3 text-sm text-neutral-700">
          The new rule also applies to days that have passed: the grid and the streak are worked out
          again with it. Marks you made are kept, even on days that no longer count.
        </p>
      )}

      <Field
        label="Starts on"
        hint="Pick an earlier day to fill in what you already did."
        error={errors.startDate?.message}
      >
        {(control) => (
          <Input
            type="date"
            min={START_DATE_MIN}
            max={START_DATE_MAX}
            {...control}
            {...register('startDate')}
          />
        )}
      </Field>

      <Field label="Note (optional)" error={errors.description?.message}>
        {(control) => <Textarea rows={3} {...control} {...register('description')} />}
      </Field>

      <FormMessage message={formMessage} />

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={!canSubmit}>
          {submitLabel}
          {perWeek}
        </Button>
      </div>
    </form>
  );
}
