import logoUrl from '@/assets/logo.svg';
import { cn } from '@/shared/lib/cn';

interface BrandMarkProps {
  /** Size, e.g. `size-11`. */
  className?: string;
}

/**
 * The logo, the same for everybody: a notebook with a bookmark and a tick on a sage circle. It is
 * the tab icon too - `src/assets/logo.svg`, one file for both, so they cannot drift apart. Vite
 * puts a hash into its file name, so a browser can never show an older version from its cache
 * (a plain `favicon.svg` is cached for an hour, and tab icons are cached even longer).
 * Decoration: the name of the service next to it says it all.
 */
export function BrandMark({ className }: BrandMarkProps) {
  return <img src={logoUrl} alt="" aria-hidden className={cn('shrink-0', className)} />;
}
