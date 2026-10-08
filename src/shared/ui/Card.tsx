import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export type CardTone = 'surface' | 'sage' | 'soft';

const tones: Record<CardTone, string> = {
  surface: 'bg-surface',
  sage: 'bg-accent-2-200', // e.g. "Today's habits"
  soft: 'bg-neutral-100', // e.g. the current month in the calendar
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone;
}

export function Card({ tone = 'surface', className, ...rest }: CardProps) {
  return <div className={cn('rounded-card p-6', tones[tone], className)} {...rest} />;
}
