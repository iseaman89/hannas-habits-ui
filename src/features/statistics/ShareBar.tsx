import { percentOf } from './figures';

/**
 * How much was met, as a bar. Decoration only (`aria-hidden`): the same number is written beside
 * it, so nothing depends on seeing the bar. An empty track when nothing was judged.
 */
export function ShareBar({ done, planned }: { done: number; planned: number }) {
  const percent = percentOf(done, planned);

  return (
    <div aria-hidden className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
      <div className="h-full rounded-full bg-accent-2-600" style={{ width: `${percent ?? 0}%` }} />
    </div>
  );
}
