import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import { controlStyles } from './Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** No border or fill: for writing straight into a card (the diary's highlight). */
  bare?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { bare, className, rows = 4, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        bare
          ? 'w-full resize-none bg-transparent text-base text-text placeholder:text-neutral-600 focus-visible:outline-none'
          : cn(controlStyles, 'rounded-lg py-3'),
        className,
      )}
      {...rest}
    />
  );
});
