import type { CellState } from './cells';
import { CellFace } from './DayCell';

const ITEMS: readonly { state: CellState; label: string }[] = [
  { state: 'done', label: 'Done' },
  { state: 'missed', label: 'Missed' },
  { state: 'due-today', label: 'Due today' },
  { state: 'not-scheduled', label: 'Not scheduled' },
];

/** What the cell pictures mean. */
export function GridLegend() {
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-700">
      {ITEMS.map(({ state, label }) => (
        <li key={state} className="flex items-center gap-2">
          <CellFace state={state} />
          {label}
        </li>
      ))}
    </ul>
  );
}
