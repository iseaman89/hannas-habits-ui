import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export const controlStyles =
  'w-full bg-bg px-5 text-base text-text placeholder:text-neutral-600 ' +
  'border-2 border-divider transition-colors hover:border-neutral-400 ' +
  'focus-visible:border-accent focus-visible:outline-none ' +
  'aria-invalid:border-accent-700 disabled:cursor-not-allowed disabled:opacity-45';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/** A pill-shaped text input. Forwards its ref, so React Hook Form's `register` works. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...rest },
  ref,
) {
  return (
    <input ref={ref} className={cn(controlStyles, 'h-12 rounded-full', className)} {...rest} />
  );
});
