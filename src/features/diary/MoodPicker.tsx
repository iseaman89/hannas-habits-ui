import { useId } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { IconButton } from '@/shared/ui';
import type { Mood } from './diaryDraft';
import { MOODS } from './moods';

interface MoodPickerProps {
  value: Mood | null;
  /** `null` = no mood. */
  onChange: (mood: Mood | null) => void;
  /** For the row's place in the page; the look is the picker's own. */
  className?: string;
}

/**
 * Five faces, one of them chosen - just the faces, no title and no word for the chosen one (the
 * card around it, `DiaryWelcome`, says what they are for; a face's name is its tooltip and what a
 * screen reader hears). A radio group of real radio inputs (hidden, the circle is their label),
 * so the arrow keys, the group name and "selected" come from the browser. A radio cannot be
 * un-chosen by itself, hence the small clear button: a day may have no mood at all.
 *
 * The clear button has its place from the start, empty until a mood is chosen: if it only
 * appeared then, the faces would jump aside the moment the person clicks one.
 */
export function MoodPicker({ value, onChange, className }: MoodPickerProps) {
  const name = useId();

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div role="radiogroup" aria-label="Mood" className="flex items-center gap-2 sm:gap-3">
        {MOODS.map(({ value: mood, label, Icon, chosen: chosenStyle }) => (
          <label key={mood} title={label} className="cursor-pointer">
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
                // 50 px where there is room, down to 36 px so that all five fit on a narrow phone.
                'grid size-[clamp(2.25rem,11vw,3.125rem)] place-items-center rounded-full transition-colors',
                'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
                value === mood ? chosenStyle : 'bg-bg text-neutral-700 hover:bg-neutral-200',
              )}
            >
              <Icon className="size-[56%]" aria-hidden />
              <span className="sr-only">{label}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="size-8 shrink-0">
        {value !== null && (
          <IconButton label="Clear mood" size="sm" onClick={() => onChange(null)}>
            <X aria-hidden />
          </IconButton>
        )}
      </div>
    </div>
  );
}
