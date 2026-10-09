import type { InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

type CheckboxShape = 'square' | 'circle';
type CheckboxTone = 'accent' | 'accent-2';

const shapes: Record<CheckboxShape, { box: string; mark: string }> = {
  square: { box: 'size-[1.375rem] rounded-sm', mark: 'size-3.5' }, // 22 px, a task
  circle: { box: 'size-7 rounded-full', mark: 'size-4' }, // 28 px, a habit of the day
};

const tones: Record<CheckboxTone, string> = {
  accent: 'border-neutral-400 checked:border-accent checked:bg-accent',
  'accent-2': 'border-accent-2 checked:bg-accent-2',
};

interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'onChange' | 'aria-label' | 'size'
> {
  /** The accessible name ("Done: Call the dentist"). Required: the box itself says nothing. */
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  shape?: CheckboxShape;
  tone?: CheckboxTone;
}

/**
 * A real `<input type="checkbox">` drawn as the design's box (rounded square or circle): the
 * keyboard, the focus and the screen reader's "checked" come from the browser, the look from
 * `appearance-none` and the `checked:` styles, and the tick is an icon laid over it.
 */
export function Checkbox({
  label,
  checked,
  onChange,
  shape = 'square',
  tone = 'accent',
  className,
  ...rest
}: CheckboxProps) {
  const { box, mark } = shapes[shape];

  return (
    <span className={cn('relative inline-grid shrink-0', box, className)}>
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className={cn(
          'peer m-0 size-full cursor-pointer appearance-none border-2 bg-transparent transition-colors',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          'disabled:cursor-not-allowed disabled:opacity-45',
          box,
          tones[tone],
        )}
        {...rest}
      />
      <Check
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 m-auto text-bg opacity-0 peer-checked:opacity-100',
          mark,
        )}
      />
    </span>
  );
}
