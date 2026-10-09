import { useId } from 'react';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui';
import {
  EVERY_DAY,
  MONDAY_FIRST,
  WEEKDAYS,
  WEEKEND,
  dayName,
  inWeekOrder,
  sameDays,
  type DayOfWeek,
} from './weekdays';

const PRESETS = [
  { label: 'Every day', days: EVERY_DAY },
  { label: 'Weekdays', days: WEEKDAYS },
  { label: 'Weekends', days: WEEKEND },
] as const;

interface WeekdayToggleProps {
  value: readonly DayOfWeek[];
  onChange: (days: DayOfWeek[]) => void;
  /** The message under the toggles, e.g. the server's "at least one day". */
  error?: string;
}

/**
 * The seven round day toggles (Monday first) with the presets under them. Each is a real
 * `button` with `aria-pressed` and the day's full name, so it works with the keyboard and
 * reads out properly; the letters are only the picture.
 */
export function WeekdayToggle({ value, onChange, error }: WeekdayToggleProps) {
  const errorId = useId();

  function toggle(day: DayOfWeek) {
    onChange(inWeekOrder(value.includes(day) ? value.filter((d) => d !== day) : [...value, day]));
  }

  return (
    <fieldset aria-describedby={error ? errorId : undefined} className="flex flex-col gap-2.5">
      <legend className="mb-1.5 px-3 text-sm font-bold">Repeat on</legend>
      <div className="flex flex-wrap gap-2">
        {MONDAY_FIRST.map((day) => {
          const on = value.includes(day);
          return (
            <button
              key={day}
              type="button"
              aria-pressed={on}
              aria-label={dayName(day).long}
              onClick={() => toggle(day)}
              className={cn(
                'size-10 cursor-pointer rounded-full border-2 font-display transition-colors',
                on
                  ? 'border-accent bg-accent text-bg hover:border-accent-hover hover:bg-accent-hover'
                  : 'border-divider bg-bg text-neutral-800 hover:border-neutral-400',
              )}
            >
              <span aria-hidden>{dayName(day).letter}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(({ label, days }) => {
          const active = sameDays(value, days);
          return (
            <Button
              key={label}
              size="sm"
              variant={active ? 'secondary' : 'ghost'}
              aria-pressed={active}
              onClick={() => onChange(inWeekOrder(days))}
            >
              {label}
            </Button>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="px-3 text-sm font-semibold text-accent-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}
