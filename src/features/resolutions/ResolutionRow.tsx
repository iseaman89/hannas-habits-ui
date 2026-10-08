import { Check, ListChecks, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import { Button, IconButton, Tag } from '@/shared/ui';
import type { Resolution } from './resolutionsGateway';

interface ResolutionRowProps {
  item: Resolution;
  /** 1-based, as the list is numbered. */
  number: number;
  onToggleKept: (item: Resolution, kept: boolean) => void;
  onEdit: (item: Resolution) => void;
  onDelete: (item: Resolution) => void;
}

/**
 * One resolution: its number in a circle (sage once kept), the title, the habit it is tracked by
 * (a link to the Habits screen) and the buttons - "Mark kept" / "Kept" toggles it, the pencil and
 * the bin open the edit and delete dialogs. The number is decoration: the list is an `<ol>`.
 */
export function ResolutionRow({
  item,
  number,
  onToggleKept,
  onEdit,
  onDelete,
}: ResolutionRowProps) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-divider py-3 first:border-t-0 first:pt-0">
      <span
        aria-hidden
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-full font-display text-lg',
          // Sage-700, not the design's `accent-2`: the number on it is 5.43 : 1 instead of 3.14 : 1 (DESIGN.md §8).
          item.kept ? 'bg-accent-2-700 text-bg' : 'bg-accent-200 text-accent-800',
        )}
      >
        {number}
      </span>

      <div className="min-w-0 flex-1 basis-48">
        <p className="break-words text-[1.0625rem] font-bold">{item.title}</p>
        {item.habitTitle !== null && (
          <Link
            to="/habits"
            className="mt-0.5 inline-flex max-w-full items-center gap-1.5 rounded-full text-sm text-accent-700 hover:text-accent-800"
          >
            <ListChecks aria-hidden className="size-4 shrink-0" />
            <span className="truncate">Tracked by “{item.habitTitle}”</span>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-1">
        {item.kept ? (
          <button
            type="button"
            onClick={() => onToggleKept(item, false)}
            className="cursor-pointer rounded-full"
          >
            <Tag tone="accent-2" icon={<Check aria-hidden />}>
              Kept
            </Tag>
            <span className="sr-only">: {item.title} - mark as not kept</span>
          </button>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => onToggleKept(item, true)}>
            Mark kept<span className="sr-only">: {item.title}</span>
          </Button>
        )}
        <IconButton label={`Edit ${item.title}`} size="sm" onClick={() => onEdit(item)}>
          <Pencil />
        </IconButton>
        <IconButton label={`Delete ${item.title}`} size="sm" onClick={() => onDelete(item)}>
          <Trash2 />
        </IconButton>
      </div>
    </li>
  );
}
