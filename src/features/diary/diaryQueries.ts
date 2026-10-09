import { useQuery } from '@tanstack/react-query';
import { draftFromDocument, type DiaryDraft } from './diaryDraft';
import type { DateRange, DiaryGateway } from './diaryGateway';

/**
 * Query keys: the feature first, then what the data depends on. `days` is the parent of every
 * list of days with an entry (the calendar's year), so a write can mark all of them at once.
 */
export const diaryKeys = {
  all: ['diary'] as const,
  day: (date: string) => ['diary', 'day', date] as const,
  days: ['diary', 'days'] as const,
  daysIn: (range: DateRange) => ['diary', 'days', range] as const,
};

/**
 * One day as the form's draft. The cache holds the text a day was *left* with (see
 * `DiaryEditor`), which can be newer than the server's copy while a write is still on its way -
 * so it is never refreshed behind the person's back: no refetch on focus, on remount or on
 * reconnect, ever (`staleTime: Infinity`). It lives for the cache's default five minutes after
 * the person leaves the day, long enough for any write to have finished.
 */
export function useDiaryDay(gateway: DiaryGateway, date: string) {
  return useQuery<DiaryDraft>({
    queryKey: diaryKeys.day(date),
    queryFn: async ({ signal }) => draftFromDocument(await gateway.load(date, signal)),
    staleTime: Infinity,
  });
}

/**
 * The days of a range that have an entry, with their mood. Unlike `useDiaryDay` this is an
 * ordinary query: it is refreshed like any list - and every successful write of a day marks it
 * out of date (see `useDayAutosave`), so the calendar never keeps showing a day as empty that
 * was just written.
 */
export function useDiaryDays(gateway: DiaryGateway, range: DateRange) {
  return useQuery({
    queryKey: diaryKeys.daysIn(range),
    queryFn: ({ signal }) => gateway.days(range, signal),
  });
}
