import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { controlStyles } from './Input';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/**
 * A pill-shaped native `<select>`: the browser keeps the list, the keyboard and the screen reader's
 * "collapsed, 3 of 7"; only the closed control is drawn like the other inputs. Forwards its ref, so
 * React Hook Form's `register` works, and takes the `Field` wiring like `Input` does.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <span className="relative block">
      <select
        ref={ref}
        className={cn(controlStyles, 'h-12 appearance-none rounded-full pr-12', className)}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-neutral-700"
      />
    </span>
  );
});
