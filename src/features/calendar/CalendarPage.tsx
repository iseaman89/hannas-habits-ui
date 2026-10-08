import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { diaryGateway, useDiaryDays, type DiaryGateway } from '@/features/diary';
import { errorMessage } from '@/shared/api';
import { toApiDate } from '@/shared/lib/dates';
import { Button, FormMessage, IconButton, PageHeader, Skeleton, SkeletonGroup } from '@/shared/ui';
import type { Mood } from './dayState';
import { MonthCard } from './MonthCard';
import { MoodLegend } from './MoodLegend';
import { FIRST_YEAR, parseYearParam, yearRange } from './years';

/**
 * The year at a glance (DESIGN.md §4.4): twelve month cards, every day with an entry in the
 * colour of its mood, a click opens that day's diary. The year is part of the address
 * (`?year=2025`), so a reload and the back button stay where the person was. One request feeds
 * the whole screen: the days of the year that have an entry, with their mood.
 */
export function CalendarPage({ gateway = diaryGateway }: { gateway?: DiaryGateway }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const now = new Date();
  const today = toApiDate(now);
  const currentYear = now.getFullYear();
  const year = parseYearParam(searchParams.get('year'), currentYear) ?? currentYear;

  const days = useDiaryDays(gateway, yearRange(year));
  const entries = useMemo(
    () => new Map<string, Mood | null>(days.data?.map((day) => [day.date, day.mood])),
    [days.data],
  );

  function showYear(target: number) {
    // The current year is the default: keep its address clean.
    setSearchParams(target === currentYear ? {} : { year: String(target) });
  }

  /** What is under the legend. Data that is there wins: a refresh that fails must not wipe the year. */
  function renderBody() {
    if (days.data === undefined) {
      if (!days.isError) {
        return (
          <SkeletonGroup
            label="Loading the calendar"
            className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-6"
          >
            {Array.from({ length: 12 }, (_, month) => (
              <Skeleton key={month} className="h-56 rounded-card" />
            ))}
          </SkeletonGroup>
        );
      }
      return (
        <div className="flex flex-col items-start gap-4">
          <FormMessage message={errorMessage(days.error, 'The calendar could not be loaded.')} />
          <Button variant="secondary" onClick={() => void days.refetch()}>
            Try again
          </Button>
        </div>
      );
    }

    return (
      <>
        {days.data.length === 0 && (
          <p className="text-neutral-800">
            No diary entries in {year} yet. Pick a day to write the first one.
          </p>
        )}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-6">
          {Array.from({ length: 12 }, (_, index) => new Date(year, index, 1)).map((month) => (
            <MonthCard
              key={month.getMonth()}
              month={month}
              today={today}
              entries={entries}
              current={year === currentYear && month.getMonth() === now.getMonth()}
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        kicker="Calendar"
        title={year}
        actions={
          <>
            {year !== currentYear && (
              <Button variant="ghost" size="sm" onClick={() => showYear(currentYear)}>
                This year
              </Button>
            )}
            <IconButton
              label="Previous year"
              variant="secondary"
              disabled={year <= FIRST_YEAR}
              onClick={() => showYear(year - 1)}
            >
              <ChevronLeft />
            </IconButton>
            {/* There is no diary for a year that has not begun. */}
            <IconButton
              label="Next year"
              variant="secondary"
              disabled={year >= currentYear}
              onClick={() => showYear(year + 1)}
            >
              <ChevronRight />
            </IconButton>
          </>
        }
      />

      <div className="mt-6 flex flex-col gap-6">
        <MoodLegend />
        {renderBody()}
      </div>
    </>
  );
}
