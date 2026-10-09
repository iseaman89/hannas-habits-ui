import { MOODS } from '@/features/diary';
import { DayFace } from './DayDot';

/** What the colours of the days mean: the five moods, and the entry without one. */
export function MoodLegend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-700">
      {MOODS.map(({ value, label }) => (
        <li key={value} className="flex items-center gap-2">
          <DayFace state={{ kind: 'mood', mood: value }} size="swatch" />
          {label}
        </li>
      ))}
      <li className="flex items-center gap-2">
        <DayFace state={{ kind: 'no-mood' }} size="swatch" />
        No mood
      </li>
    </ul>
  );
}
