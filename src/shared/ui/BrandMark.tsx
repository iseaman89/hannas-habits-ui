import { Check } from 'lucide-react';
import { brandInitial } from '@/shared/lib/brand';
import { cn } from '@/shared/lib/cn';

interface BrandMarkProps {
  /** The first name the service is named after. */
  firstName: string;
  /** Size and type size, e.g. `size-11 text-xl`. */
  className?: string;
}

/**
 * The logo: a sage circle with the first letter of the name - one letter, never two (see
 * `brandInitial`) - or the tick when the name has no letter. Decoration: the name next to it says it all.
 */
export function BrandMark({ firstName, className }: BrandMarkProps) {
  const initial = brandInitial(firstName);

  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-accent-2 font-display leading-none text-bg',
        className,
      )}
    >
      {initial || <Check className="size-1/2" />}
    </span>
  );
}
