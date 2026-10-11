import { addMonths, format, isSameMonth, startOfMonth, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  habitsGateway,
  isQuota,
  monthRange,
  parseMonthParam,
  toMonthParam,
  useHabitStatistics,
  type HabitsGateway,
} from '@/features/habits';
import { errorMessage } from '@/shared/api';
import { toApiDate } from '@/shared/lib/dates';
import { useToday } from '@/shared/lib/useToday';
import {
  Button,
  buttonClassName,
  FormMessage,
  IconButton,
  PageHeader,
  Skeleton,
  SkeletonGroup,
} from '@/shared/ui';
import { HabitStatisticsCard } from './HabitStatisticsCard';

/**
 * What was planned and done in a month, per habit and per part, and when each was last done. One
 * request feeds the screen and the server does the counting (the rules sit in the backend's
 * Domain, next to the streak's); this only shows it. The month is part of the address
 * (`?month=2026-09`), the same one the habit grid uses, so "Statistics" opens on the month the
 * person was looking at.
 */
export function StatisticsPage({ gateway = habitsGateway }: { gateway?: HabitsGateway }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const now = useToday();
  const today = toApiDate(now);
  const month = parseMonthParam(searchParams.get('month')) ?? startOfMonth(now);

  const statistics = useHabitStatistics(gateway, { ...monthRange(month), asOf: today });

  function showMonth(target: Date) {
    // The current month is the default: keep its address clean.
    setSearchParams(isSameMonth(target, now) ? {} : { month: toMonthParam(target) });
  }

  /** What is under the header. Data that is there wins: a refresh that fails must not wipe the cards. */
  function renderBody() {
    const habits = statistics.data;

    if (habits === undefined) {
      if (!statistics.isError) {
        return (
          <SkeletonGroup label="Loading the statistics" className="flex flex-col gap-6">
            {[0, 1, 2].map((card) => (
              <Skeleton key={card} className="h-40 rounded-card" />
            ))}
          </SkeletonGroup>
        );
      }
      return (
        <div className="flex flex-col items-start gap-4">
          <FormMessage
            message={errorMessage(statistics.error, 'The statistics could not be loaded.')}
          />
          <Button variant="secondary" onClick={() => void statistics.refetch()}>
            Try again
          </Button>
        </div>
      );
    }

    if (habits.length === 0) {
      return (
        <div className="flex flex-col items-start gap-4">
          <p className="text-neutral-800">
            There is nothing to count yet. Add a habit and tick it off - its numbers show up here.
          </p>
          <Link to="/habits" className={buttonClassName()}>
            Go to the habits
          </Link>
        </div>
      );
    }

    return (
      <>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,22rem),1fr))] items-start gap-6">
          {habits.map((habit) => (
            <HabitStatisticsCard key={habit.id} habit={habit} today={today} />
          ))}
        </ul>
        <p className="text-sm text-neutral-700">
          Only days that are over are counted; today counts once it is done.
          {habits.some((habit) => isQuota(habit.recurrence)) &&
            ' A week counts for the month it ends in, and one that is still running only when it has reached its number.'}
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        pinned
        kicker="Statistics"
        title={format(month, 'MMMM yyyy')}
        actions={
          <>
            {!isSameMonth(month, now) && (
              <Button variant="ghost" size="sm" onClick={() => showMonth(now)}>
                This month
              </Button>
            )}
            <IconButton
              label="Previous month"
              variant="secondary"
              onClick={() => showMonth(subMonths(month, 1))}
            >
              <ChevronLeft />
            </IconButton>
            <IconButton
              label="Next month"
              variant="secondary"
              onClick={() => showMonth(addMonths(month, 1))}
            >
              <ChevronRight />
            </IconButton>
          </>
        }
      />

      <div className="mt-6 flex flex-col gap-6">{renderBody()}</div>
    </>
  );
}
