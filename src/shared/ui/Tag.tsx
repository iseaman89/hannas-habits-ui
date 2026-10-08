import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export type TagTone = 'accent' | 'accent-2' | 'neutral' | 'outline';

const tones: Record<TagTone, string> = {
  accent: 'bg-accent-200 text-accent-800',
  'accent-2': 'bg-accent-2-200 text-accent-2-800',
  neutral: 'bg-neutral-200 text-neutral-800',
  outline: 'border border-neutral-400 text-neutral-700',
};

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: TagTone;
  icon?: ReactNode;
}

/** A small read-only pill (status, category). Not interactive; use a Button for that. */
export function Tag({ tone = 'accent', icon, className, children, ...rest }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold',
        '[&_svg]:size-3.5',
        tones[tone],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
}
