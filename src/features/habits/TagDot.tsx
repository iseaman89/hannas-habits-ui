import { cn } from '@/shared/lib/cn';
import type { TagSummary } from '@/features/tags';

interface TagDotProps {
  /** Names the day for a screen reader, e.g. "Stretch, Wed 7 Oct". */
  label: string;
  tags: readonly TagSummary[];
  onOpen: () => void;
}

/**
 * The small dot under a day's cell that opens the day's tags. The cell itself stays "tick": the
 * tags are a second, separate control, so a tag can be put on a missed day too.
 *
 * - A day with tags always shows a filled dot (`title` lists them: the quick look).
 * - An empty day shows a ring only when the row is hovered or focused, and faintly on a screen
 *   without hover (a phone), where nothing could ever reveal it.
 * - The hit area is bigger than the 8 px dot (`before:`), and lies below the cell, not on it.
 */
export function TagDot({ label, tags, onOpen }: TagDotProps) {
  const tagged = tags.length > 0;
  const names = tags.map((tag) => tag.name).join(', ');

  return (
    <button
      type="button"
      aria-label={tagged ? `Tags, ${label}: ${names}` : `Add tags, ${label}`}
      title={tagged ? names : 'Add tags'}
      onClick={onOpen}
      className={cn(
        'absolute bottom-0.5 left-1/2 grid -translate-x-1/2 cursor-pointer place-items-center',
        'rounded-full before:absolute before:-inset-x-2 before:-inset-y-1',
        !tagged &&
          'opacity-0 focus-visible:opacity-100 group-focus-within/day:opacity-100 group-hover/day:opacity-100 [@media(hover:none)]:opacity-60',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'block size-2 rounded-full',
          tagged ? 'bg-accent' : 'border border-neutral-500',
        )}
      />
    </button>
  );
}
