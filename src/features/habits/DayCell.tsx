import { Check } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { isToggleable, type CellState } from './cells';

const faceBase = 'grid size-5 place-items-center rounded-full transition-[filter]';

const dot = 'after:block after:size-1.5 after:rounded-full';

/** The look of each state (DESIGN.md §4.3). Done and missed use the app's own colours. */
const faceStyles: Record<CellState, string> = {
  done: 'bg-accent-2-500 text-bg',
  missed: 'bg-miss',
  'due-today': 'border-[2.5px] border-accent',
  upcoming: 'border-[1.5px] border-neutral-400',
  'not-scheduled': `${dot} after:bg-neutral-400`,
  'before-start': `${dot} after:bg-neutral-300`,
};

/** What a screen reader hears for a cell that cannot be clicked (a clickable one is a toggle button). */
const stateText: Record<CellState, string> = {
  done: 'done',
  missed: 'missed',
  'due-today': 'due today',
  upcoming: 'upcoming',
  'not-scheduled': 'not scheduled',
  'before-start': 'before the habit started',
};

/** Just the picture of a state; also the legend's samples. */
export function CellFace({ state, className }: { state: CellState; className?: string }) {
  return (
    <span aria-hidden className={cn(faceBase, faceStyles[state], className)}>
      {state === 'done' && <Check className="size-3.5" />}
    </span>
  );
}

interface DayCellProps {
  state: CellState;
  /** Names the day for a screen reader, e.g. "Stretch, Wed 7 Oct". */
  label: string;
  onToggle: () => void;
}

/**
 * One day of one habit. A day that can be ticked is a real toggle button (`aria-pressed` says
 * "done"); every other day is a picture with a text, never a dead button.
 */
export function DayCell({ state, label, onToggle }: DayCellProps) {
  if (!isToggleable(state)) {
    return (
      <span role="img" aria-label={`${label}: ${stateText[state]}`} className="inline-grid">
        <CellFace state={state} />
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={state === 'done'}
      aria-label={label}
      onClick={onToggle}
      className="group inline-grid cursor-pointer rounded-full"
    >
      <CellFace state={state} className="group-hover:brightness-90" />
    </button>
  );
}
