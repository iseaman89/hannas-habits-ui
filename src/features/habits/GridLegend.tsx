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
 * are not missed ones. `parts`: some habit has parts, shown as "1/2" under the days they are due.
 */
export function GridLegend({ quota = false, parts = false }: { quota?: boolean; parts?: boolean }) {
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
      {parts && (
        <li className="flex items-center gap-2">
          <span aria-hidden className="text-xs font-bold tabular-nums text-neutral-700">
            1/2
          </span>
          Parts done that day (click to tick them one by one)
        </li>
      )}
    </ul>
  );
}
