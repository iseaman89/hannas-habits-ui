import { useId } from 'react';
import { cn } from '@/shared/lib/cn';
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
 * so the arrow keys, the group name and "selected" come from the browser.
 *
 * A radio cannot be un-chosen by itself, but a day may have no mood at all: choosing the chosen
 * face once more clears it. (There used to be a clear button beside the faces; keeping its place
 * free pushed the faces off the middle, and letting it appear moved them.) The group says so
 * to a screen reader, since a radio group does not do that on its own.
 *
 * On a narrow card the faces share the whole width, so they sit in the middle with the same room
 * at both ends; where the card is wide enough to put them beside the greeting they keep their own
 * width and end at the card's padding.
 */
export function MoodPicker({ value, onChange, className }: MoodPickerProps) {
  const name = useId();
  const hint = `${name}-hint`;

  return (
    <>
      <p id={hint} className="sr-only">
        Choose the chosen mood again to clear it.
      </p>
      <div
        role="radiogroup"
        aria-label="Mood"
        aria-describedby={hint}
        className={cn(
          'flex w-full items-center justify-between @3xl:w-auto @3xl:justify-end @3xl:gap-3',
          className,
        )}
      >
        {MOODS.map(({ value: mood, label, Icon, chosen: chosenStyle }) => (
          <label
            key={mood}
            title={value === mood ? `${label} (choose again to clear)` : label}
            className="cursor-pointer"
          >
            <input
              type="radio"
              name={name}
              value={mood}
              checked={value === mood}
              onChange={() => onChange(mood)}
              // A radio that is already chosen fires a click but no change.
              onClick={() => {
                if (value === mood) onChange(null);
              }}
              className="peer sr-only"
            />
            <span
              className={cn(
                // 50 px where there is room, down to 36 px so that all five fit a narrow phone.
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
    </>
  );
}
