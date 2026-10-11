import { type SubHabit } from './subHabits';

interface DayNotesTipProps {
  /** The habit, e.g. "Sport". */
  title: string;
  /** The day in words, e.g. "Mon 5 Oct". */
  dayLabel: string;
  /** The parts that have a note that day, with it. */
  parts: readonly { part: SubHabit; note: string }[];
}

/**
 * What the card on a habit's day cell says: the parts that have a note that day, by name, and the
 * note under each. Read only - the notes are written in the parts' own rows. A day without a note
 * has no card, so there is nothing to say for a part without one.
 */
export function DayNotesTip({ title, dayLabel, parts }: DayNotesTipProps) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="truncate text-sm font-bold" title={title}>
          {title}
        </p>
        <p className="text-xs text-neutral-700">{dayLabel}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {parts.map(({ part, note }) => (
          <li key={part.id} className="min-w-0">
            <p className="truncate text-sm font-bold" title={part.title}>
              {part.title}
            </p>
            <p className="whitespace-pre-wrap break-words text-sm text-neutral-800">{note}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
