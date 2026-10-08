import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * A grey block where content is on its way. Shaped like what will replace it, so the page does
 * not jump when the data arrives (a spinner in the middle of nothing does). Pulses; the global
 * `prefers-reduced-motion` rule in the base layer stops that for people who asked for it.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-text/10', className)} />;
}

interface SkeletonGroupProps {
  /** What a screen reader says: the blocks themselves are invisible to it. */
  label: string;
  className?: string;
  children: ReactNode;
}

/** One announcement ("Loading habits") for a set of `Skeleton`s. */
export function SkeletonGroup({ label, className, children }: SkeletonGroupProps) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
