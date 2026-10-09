import { cn } from '@/shared/lib/cn';

interface BrandMarkProps {
  /** Size, e.g. `size-11`. */
  className?: string;
}

/**
 * The logo, the same for everybody: a notebook with a bookmark and a tick on a sage circle. It is
 * the tab icon too - `public/favicon.svg`, one file for both, so they cannot drift apart.
 * Decoration: the name of the service next to it says it all.
 */
export function BrandMark({ className }: BrandMarkProps) {
  return <img src="/favicon.svg" alt="" aria-hidden className={cn('shrink-0', className)} />;
}
