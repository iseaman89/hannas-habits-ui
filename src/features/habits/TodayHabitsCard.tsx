import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { errorMessage } from '@/shared/api';
import { parseApiDate, toApiDate } from '@/shared/lib/dates';
import { useToday } from '@/shared/lib/useToday';
import { Button, Card, Checkbox, FormMessage, Skeleton, SkeletonGroup } from '@/shared/ui';
import { cellState, isToggleable, type CellState } from './cells';
import { useMarkHabit } from './habitMutations';
import { useHabitOverview } from './habitQueries';
import { habitsGateway, type HabitOverview, type HabitsGateway } from './habitsGateway';
import { StreakBadge } from './StreakBadge';

interface TodayHabitsCardProps {
  /** The day the diary shows, `yyyy-MM-dd`. */
  date: string;
  gateway?: HabitsGateway;
}

interface HabitOfTheDay {
  habit: HabitOverview;
  state: CellState;
}

/**
 * The habits that are on the plan for one day, to tick there (DESIGN.md §4.2) - the diary's
 * side panel. It asks for the overview of just that day (`from = to = date`) and shares the
 * cache and the marking with the month grid, so a tick here shows in the grid and the other way
 * round. What counts for the day is `cellState`, the same rule as the grid: a habit that did
 * not exist yet, or is not planned for that weekday, is left out. The streak shown is the
 * current one as of the real today, not of the day that is on screen.
 */
export function TodayHabitsCard({ date, gateway = habitsGateway }: TodayHabitsCardProps) {
  const today = toApiDate(useToday());
  const overview = useHabitOverview(gateway, { from: date, to: date, asOf: today });
  const mark = useMarkHabit(gateway);

  // `date` comes from a validated route, so the parse only fails for a caller that got it wrong.
  const day = parseApiDate(date);
  const planned: HabitOfTheDay[] | undefined =
    day && overview.data
      ? overview.data
          .map((habit) => ({
            habit,
            state: cellState({
              date: day,
              today,
              startDate: habit.startDate,
              schedule: habit.schedule,
              done: habit.completedDates.includes(date),
            }),
          }))
          .filter(({ state }) => state !== 'before-start' && state !== 'not-scheduled')
      : undefined;

  /** What the card shows. Data that is there wins: a refresh that fails must not wipe the list. */
  function renderBody() {
    if (planned === undefined) {
      if (!overview.isError) {
        return (
          <SkeletonGroup label="Loading habits" className="flex flex-col gap-3">
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-8" />
            ))}
          </SkeletonGroup>
        );
      }
      return (
        <div className="flex flex-col items-start gap-3">
          <FormMessage message={errorMessage(overview.error, 'The habits could not be loaded.')} />
          <Button variant="secondary" size="sm" onClick={() => void overview.refetch()}>
            Try again
          </Button>
        </div>
      );
    }

    if (planned.length === 0) {
      return <p className="text-accent-2-900">Nothing is planned for this day.</p>;
    }

    return (
      <ul className="flex flex-col gap-3">
        {planned.map(({ habit, state }) => (
          <li key={habit.id} className="flex items-center gap-3">
            <Checkbox
              shape="circle"
              tone="accent-2"
              label={habit.title}
              checked={state === 'done'}
              disabled={!isToggleable(state)}
              onChange={(done) => mark.mutate({ habitId: habit.id, date, done })}
            />
            <span aria-hidden className="min-w-0 flex-1 truncate font-semibold">
              {habit.title}
            </span>
            <StreakBadge days={habit.currentStreak} />
          </li>
        ))}
      </ul>
    );
  }

  const doneCount = planned?.filter(({ state }) => state === 'done').length ?? 0;

  return (
    <Card tone="sage">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-card">
          {date === today ? 'Today’s habits' : 'Habits of the day'}
        </h2>
        <Link
          to="/habits"
          className="inline-flex items-center gap-1 rounded-full font-bold text-accent-2-800 hover:text-accent-2-900"
        >
          {planned ? (
            <>
              {doneCount} of {planned.length}
              <span className="sr-only"> done - open the habits</span>
            </>
          ) : (
            'Habits'
          )}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="mt-3">{renderBody()}</div>
    </Card>
  );
}
