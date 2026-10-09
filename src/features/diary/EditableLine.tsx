import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { IconButton } from '@/shared/ui';

interface EditableLineProps {
  /** The dot or checkbox in front of the text. */
  marker: ReactNode;
  value: string;
  /** Names the text input and the remove button ("Grateful for 2"). */
  label: string;
  maxLength: number;
  /** Crossed out (a finished task). */
  struck?: boolean;
  onChange: (value: string) => void;
  onRemove: () => void;
}

/**
 * One row of a list: a marker, the text as an input you can edit in place, and a remove button
 * that shows on hover or focus. A row left blank is removed when the input is left - blank
 * lines are not stored, so keeping an empty row around would only be confusing.
 */
export function EditableLine({
  marker,
  value,
  label,
  maxLength,
  struck,
  onChange,
  onRemove,
}: EditableLineProps) {
  return (
    <li className="group flex items-center gap-3">
      {marker}
      <input
        type="text"
        aria-label={label}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => {
          if (value.trim() === '') onRemove();
        }}
        className={cn(
          'min-w-0 flex-1 bg-transparent py-1.5 text-base focus-visible:outline-none',
          struck ? 'text-neutral-600 line-through' : 'text-text',
        )}
      />
      <IconButton
        label={`Remove ${label}`}
        size="sm"
        onClick={onRemove}
        className="opacity-0 focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100"
      >
        <X aria-hidden />
      </IconButton>
    </li>
  );
}
