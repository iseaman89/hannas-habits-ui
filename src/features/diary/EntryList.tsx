import { useId } from 'react';
import { cn } from '@/shared/lib/cn';
import { Card } from '@/shared/ui';
import { AddItemInput } from './AddItemInput';
import { DIARY_LIMITS, newRowId, type DraftEntry } from './diaryDraft';
import { EditableLine } from './EditableLine';

interface EntryListProps {
  title: string;
  /** Names the add input for a screen reader ("Add something you are grateful for"). */
  addLabel: string;
  /** What the add row says ("Add something…"). */
  placeholder: string;
  items: readonly DraftEntry[];
  onChange: (items: DraftEntry[]) => void;
  /** The colour of the dots. */
  tone: 'sage' | 'accent';
}

const dots = { sage: 'bg-accent-2', accent: 'bg-accent-400' } as const;

/** "Grateful for" and "Something I learnt": short lines with a coloured dot, add at the end. */
export function EntryList({ title, addLabel, placeholder, items, onChange, tone }: EntryListProps) {
  const headingId = useId();
  const full = items.length >= DIARY_LIMITS.entriesPerList;

  return (
    <Card>
      <h2 id={headingId} className="font-display text-card">
        {title}
      </h2>

      <ul aria-labelledby={headingId} className="mt-3 flex flex-col gap-0.5">
        {items.map((item, index) => (
          <EditableLine
            key={item.id}
            marker={
              <span aria-hidden className={cn('size-2.5 shrink-0 rounded-full', dots[tone])} />
            }
            label={`${title} ${index + 1}`}
            value={item.text}
            maxLength={DIARY_LIMITS.entry}
            onChange={(text) =>
              onChange(items.map((other) => (other.id === item.id ? { ...other, text } : other)))
            }
            onRemove={() => onChange(items.filter((other) => other.id !== item.id))}
          />
        ))}
      </ul>

      <div className="mt-1">
        {full ? (
          <p className="text-sm text-neutral-700">
            That is the most a day holds ({DIARY_LIMITS.entriesPerList}).
          </p>
        ) : (
          <AddItemInput
            label={addLabel}
            placeholder={placeholder}
            maxLength={DIARY_LIMITS.entry}
            onAdd={(text) => onChange([...items, { id: newRowId(), text }])}
          />
        )}
      </div>
    </Card>
  );
}
