import { useCallback, useEffect, useRef, useState } from 'react';
import { Textarea } from '@/shared/ui';

/** `SubHabitNote.TextMaxLength` of the backend. The server stays the authority. */
export const MAX_NOTE_LENGTH = 500;

/** How long after the last keystroke the note is written. */
const SAVE_DELAY_MS = 700;

/** From here on the field says how many characters are left. */
const COUNT_FROM = 400;

interface NoteEditorProps {
  /** The part, e.g. "Legs". */
  title: string;
  /** The day in words, e.g. "Mon 5 Oct". */
  dayLabel: string;
  /** What is stored now. */
  initialText: string;
  /** The trimmed text to write, or `null` to take the note away. Only called for a change. */
  onSave: (text: string | null) => void;
}

/**
 * The note of one part on one day: a free-text field in the card that opens beside the cell. It
 * writes itself - a moment after the last keystroke, when the field is left, and when the card
 * closes - so there is no button to forget. Emptying the field takes the note away.
 *
 * It holds its own draft: the text it was opened with is not replaced while it is open, so a
 * refresh from the server cannot eat what is being typed.
 */
export function NoteEditor({ title, dayLabel, initialText, onSave }: NoteEditorProps) {
  const [text, setText] = useState(initialText);
  // The latest values for the timer and the unmount, which must not see an old render's.
  const latest = useRef({ text, written: initialText.trim(), onSave });

  useEffect(() => {
    latest.current.text = text;
    latest.current.onSave = onSave;
  });

  const flush = useCallback(() => {
    const next = latest.current.text.trim();
    if (next === latest.current.written) return;
    latest.current.written = next;
    latest.current.onSave(next === '' ? null : next);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(flush, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [text, flush]);

  // The card closing unmounts the editor: write what is there.
  useEffect(() => flush, [flush]);

  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="truncate text-sm font-bold" title={title}>
          {title}
        </p>
        <p className="text-xs text-neutral-700">{dayLabel}</p>
      </div>
      <Textarea
        rows={3}
        maxLength={MAX_NOTE_LENGTH}
        value={text}
        placeholder="Add a note…"
        aria-label={`Note for ${title}, ${dayLabel}`}
        className="px-3 py-2 text-sm"
        onChange={(event) => setText(event.target.value)}
        onBlur={flush}
      />
      {text.length >= COUNT_FROM && (
        <p className="text-right text-xs tabular-nums text-neutral-700">
          {text.length}/{MAX_NOTE_LENGTH}
        </p>
      )}
    </div>
  );
}
