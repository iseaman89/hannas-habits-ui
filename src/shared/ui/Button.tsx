import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import { base, sizes, variants, type ButtonSize, type ButtonVariant } from './buttonStyles';
import { Spinner } from './Spinner';

export type { ButtonSize, ButtonVariant } from './buttonStyles';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Full width. */
  block?: boolean;
  /** Shows a spinner and blocks further clicks (a double submit would be a second request). */
  loading?: boolean;
}

/** A real <button>. `type` defaults to "button" so a button in a form never submits by accident. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    block,
    loading,
    disabled,
    type = 'button',
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], sizes[size], block && 'w-full', className)}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label'
> {
  /** What the button does. Required: an icon alone has no accessible name. */
  label: string;
  variant?: Exclude<ButtonVariant, 'primary'>;
  size?: ButtonSize;
}

/** A round button that holds just an icon. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = 'ghost', size = 'md', type = 'button', className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        base,
        variants[variant],
        size === 'md' ? 'size-9 sm:size-10' : 'size-8',
        '[&_svg]:size-5',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
