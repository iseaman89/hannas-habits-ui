import { recurrenceText, scheduleLabel, type HabitStatistics } from '@/features/habits';
import { Card } from '@/shared/ui';
import {
  countText,
  lastDoneText,
  lastDoneWhen,
  percentOf,
  streakText,
  type CountingUnit,
} from './figures';
import { ShareBar } from './ShareBar';

/** "last done yesterday" / "never done" - the end of the line under a part's bar. */
function partLastDone(lastDoneOn: string | null, today: string): string {
  const when = lastDoneWhen(lastDoneOn, today);
  return when === null ? 'never done' : `last done ${when}`;
}

/** The big number: "82 %", or a dash while nothing is judged. */
function Percent({ done, planned }: { done: number; planned: number }) {
  const percent = percentOf(done, planned);
  return <span className="font-display">{percent === null ? '–' : `${percent} %`}</span>;
}

/**
 * One habit: how much of what was planned in the month was done, when it was last done, and the
 * same for each of its parts. All numbers are the server's; this only words them.
 */
export function HabitStatisticsCard({ habit, today }: { habit: HabitStatistics; today: string }) {
  const unit: CountingUnit = habit.unit;

  return (
    <li>
      <Card className="flex flex-col gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-card font-bold" title={habit.title}>
            {habit.title}
          </h2>
          <p className="truncate text-sm text-neutral-700">{recurrenceText(habit.recurrence)}</p>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-3xl">
            <Percent done={habit.done} planned={habit.planned} />
          </p>
          <p>{countText(unit, habit.done, habit.planned)}</p>
        </div>
        <ShareBar done={habit.done} planned={habit.planned} />
        <p className="text-sm text-neutral-700">{lastDoneText(habit.lastDoneOn, today)}</p>
        <p className="text-sm text-neutral-700">
          {streakText(unit, habit.currentStreak, habit.longestStreak)}
        </p>

        {habit.subHabits.length > 0 && (
          <div className="mt-2 border-t border-divider pt-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-neutral-700">
              Parts
            </h3>
            <ul className="mt-3 flex flex-col gap-4">
              {habit.subHabits.map((part) => (
                <li key={part.id} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate font-bold" title={part.title}>
                      {part.title}
                      <span className="ml-2 text-sm font-normal text-neutral-700">
                        {scheduleLabel(part.weekdays)}
                      </span>
                    </p>
                    <p className="shrink-0 font-bold">
                      <Percent done={part.done} planned={part.planned} />
                    </p>
                  </div>
                  <ShareBar done={part.done} planned={part.planned} />
                  <p className="text-sm text-neutral-700">
                    {countText('days', part.done, part.planned)} ·{' '}
                    {partLastDone(part.lastDoneOn, today)}
                  </p>
                  <p className="text-sm text-neutral-700">
                    {streakText('days', part.currentStreak, part.longestStreak)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </li>
  );
}
