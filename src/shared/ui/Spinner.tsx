import { LoaderCircle } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

interface SpinnerProps {
  /** Accessible name. Without it the spinner is decoration (e.g. inside a button that says why). */
  label?: string;
  className?: string;
}

export function Spinner({ label, className }: SpinnerProps) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-hidden={label ? undefined : true}
      className={cn('inline-flex', className)}
    >
      <LoaderCircle className="size-[1em] animate-spin" aria-hidden />
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
