import { cn } from '@/shared/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'md' | 'sm';

export const base =
  'inline-flex cursor-pointer select-none items-center justify-center gap-2 rounded-full ' +
  'font-display transition-colors disabled:cursor-not-allowed disabled:opacity-45';

export const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-bg hover:bg-accent-hover active:bg-accent-pressed',
  secondary: 'bg-accent-200 text-accent-800 hover:bg-accent-300 active:bg-accent-400',
  ghost: 'text-accent-700 hover:bg-accent-100 active:bg-accent-200',
};

export const sizes: Record<ButtonSize, string> = {
  md: 'h-11 px-6 text-base',
  sm: 'h-9 px-4 text-sm',
};

/**
 * The classes of a button, for something that should look like one but is not: a link that goes to
 * another screen is an `<a>` (it can be opened in a new tab), not a `<button>` that navigates.
 */
export function buttonClassName({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(base, variants[variant], sizes[size], className);
}
