import { useState } from 'react';
import { Plus } from 'lucide-react';

interface AddItemInputProps {
  /** What the input is for, for a screen reader ("Add something you are grateful for"). */
  label: string;
  placeholder: string;
  maxLength: number;
  /** Gets the trimmed, non-empty text. */
  onAdd: (text: string) => void;
}

/**
 * The last, ghost row of a list: type and press Enter to add a line. Leaving the input with
 * text still in it adds that text too - the day saves by itself, so a line that was typed must
 * not be lost just because Enter was not pressed. Escape drops what was typed.
 */
export function AddItemInput({ label, placeholder, maxLength, onAdd }: AddItemInputProps) {
  const [text, setText] = useState('');

  function commit() {
    const line = text.trim();
    setText('');
    if (line !== '') onAdd(line);
  }

  return (
    <div className="flex items-center gap-3">
      <Plus aria-hidden className="size-4 shrink-0 text-neutral-600" />
      <input
        type="text"
        aria-label={label}
        placeholder={placeholder}
        maxLength={maxLength}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          } else if (event.key === 'Escape') {
            setText('');
          }
        }}
        className="min-w-0 flex-1 bg-transparent py-1.5 text-base text-text placeholder:text-neutral-600 focus-visible:outline-none"
      />
    </div>
  );
}
