import type { CellState } from './cells';
import { CellFace } from './DayCell';

const ITEMS: readonly { state: CellState; label: string }[] = [
  { state: 'done', label: 'Done' },
  { state: 'missed', label: 'Missed' },
  { state: 'due-today', label: 'Due today' },
  { state: 'not-scheduled', label: 'Not scheduled' },
];

/**
 * What the cell pictures mean. `quota`: some habit is "N times a week / month", whose open days
 * are not missed ones.
 */
export function GridLegend({ quota = false }: { quota?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-700">
      {ITEMS.map(({ state, label }) => (
        <li key={state} className="flex items-center gap-2">
          <CellFace state={state} />
          {label}
        </li>
      ))}
      {quota && (
        <li className="flex items-center gap-2">
          <CellFace state="open" />
          Not done (any day counts)
        </li>
      )}
      <li className="flex items-center gap-2">
        <span aria-hidden className="grid size-5 place-items-center">
          <span className="block size-2 rounded-full bg-accent" />
        </span>
        Tagged day (click the dot under a day to add tags)
      </li>
    </ul>
  );
}
