import { useId, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/** What a control needs to be wired to its Field: spread it onto the Input/Textarea. */
export interface FieldControlProps {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
}

interface FieldProps {
  label: string;
  hint?: string;
  /** The message under the field; also marks the control invalid. */
  error?: string;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}

/**
 * Label + control + hint/error, wired for screen readers (`for`/`id`, `aria-describedby`,
 * `aria-invalid`). The control comes in as a function so the ids are passed explicitly and typed
 * instead of being injected into a child by `cloneElement`:
 *
 *     <Field label="Email" error={errors.email?.message}>
 *       {(control) => <Input type="email" {...control} {...register('email')} />}
 *     </Field>
 */
export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="px-3 text-sm font-bold">
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error && (
        <p id={errorId} className="px-3 text-sm font-semibold text-accent-700">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="px-3 text-sm text-neutral-700">
          {hint}
        </p>
      )}
    </div>
  );
}
