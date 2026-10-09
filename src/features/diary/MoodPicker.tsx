import { useId } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Card, IconButton } from '@/shared/ui';
import type { Mood } from './diaryDraft';
import { MOODS } from './moods';

interface MoodPickerProps {
  value: Mood | null;
  /** `null` = no mood. */
  onChange: (mood: Mood | null) => void;
  /** For the card's place in the page (its width); the look is the picker's own. */
  className?: string;
}

/**
 * Five faces, one of them chosen. A radio group of real radio inputs (hidden, the circle is
 * their label), so the arrow keys, the group name and "selected" come from the browser. A radio
 * cannot be un-chosen by itself, hence the small clear button: a day may have no mood at all.
 */
export function MoodPicker({ value, onChange, className }: MoodPickerProps) {
  const name = useId();
  const chosen = MOODS.find((mood) => mood.value === value);

  return (
    <Card className={className}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={`${name}-title`} className="font-display text-card">
          Mood
        </h2>
        <div className="flex items-center gap-1">
          <span aria-hidden className="font-bold text-accent-700">
            {chosen?.label}
          </span>
          {chosen && (
            <IconButton label="Clear mood" size="sm" onClick={() => onChange(null)}>
              <X aria-hidden />
            </IconButton>
          )}
        </div>
      </div>

      <div
        role="radiogroup"
        aria-labelledby={`${name}-title`}
        className="mt-4 flex flex-wrap items-center gap-3"
      >
        {MOODS.map(({ value: mood, label, Icon, chosen: chosenStyle }) => (
          <label key={mood} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={mood}
              checked={value === mood}
              onChange={() => onChange(mood)}
              className="peer sr-only"
            />
            <span
              className={cn(
                'grid size-[3.125rem] place-items-center rounded-full transition-colors',
                'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
                value === mood ? chosenStyle : 'bg-bg text-neutral-700 hover:bg-neutral-200',
              )}
            >
              <Icon className="size-7" aria-hidden />
              <span className="sr-only">{label}</span>
            </span>
          </label>
        ))}
      </div>
    </Card>
  );
}
