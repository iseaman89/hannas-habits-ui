import { Check, CircleAlert } from 'lucide-react';
import { Button, Spinner, Tag } from '@/shared/ui';
import type { SaveStatus } from './autosave';

/**
 * The "Saved" tag next to the date (DESIGN.md §4.2). There is no save button, so this is how the
 * person knows the day is safe: saving, saved, or - the one case that needs them - not saved,
 * with a retry. The tag sits in a live region so a screen reader announces the change.
 */
export function SavedIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span role="status">
        {status === 'saved' && (
          <Tag tone="accent-2" icon={<Check aria-hidden />}>
            Saved
          </Tag>
        )}
        {status === 'saving' && (
          <Tag tone="neutral" icon={<Spinner />}>
            Saving…
          </Tag>
        )}
        {status === 'error' && (
          <Tag tone="accent" icon={<CircleAlert aria-hidden />}>
            Not saved
          </Tag>
        )}
      </span>
      {status === 'error' && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </span>
  );
}
