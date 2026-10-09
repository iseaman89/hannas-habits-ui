import { X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Card, IconButton, Slider } from '@/shared/ui';

interface ScaleCardProps {
  title: string;
  /** The ends of the scale, left and right ("Drained", "Energised"). */
  low: string;
  high: string;
  /** 0-100, `null` = not set. */
  value: number | null;
  onChange: (value: number | null) => void;
  tone: 'accent' | 'accent-2';
}

/**
 * A 0-100 slider with the number big beside it (Body, Mind). "Not set" is a state of its own -
 * a day can be just a highlight - so an untouched slider rests at the middle, dimmed, and says
 * "-" instead of a number nobody chose; the clear button takes a chosen value back.
 *
 * Not on the diary screen at the moment (switched off, not removed): the day's `body` and `mind`
 * still travel in the draft and the API; put the two cards back in `DiaryEditor` to show them.
 */
export function ScaleCard({ title, low, high, value, onChange, tone }: ScaleCardProps) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-card">{title}</h2>
        <div className="flex items-center gap-1">
          <span
            className={cn(
              'font-display text-[1.375rem]',
              tone === 'accent' ? 'text-accent-700' : 'text-accent-2-700',
            )}
          >
            {value === null ? '–' : `${value}%`}
          </span>
          {value !== null && (
            <IconButton
              label={`Clear ${title.toLowerCase()}`}
              size="sm"
              onClick={() => onChange(null)}
            >
              <X aria-hidden />
            </IconButton>
          )}
        </div>
      </div>

      <Slider
        label={`${title}: ${low} to ${high}`}
        aria-valuetext={value === null ? 'not set' : `${value} percent`}
        value={value ?? 50}
        onChange={onChange}
        tone={tone}
        className={cn('mt-3', value === null && 'opacity-50')}
      />
      <div aria-hidden className="mt-1 flex justify-between text-sm text-neutral-700">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </Card>
  );
}
