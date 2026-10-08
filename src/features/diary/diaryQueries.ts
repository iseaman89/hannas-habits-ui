import { useQuery } from '@tanstack/react-query';
import { draftFromDocument, type DiaryDraft } from './diaryDraft';
import type { DiaryGateway } from './diaryGateway';

/** Query keys: the feature first, then the day. */
export const diaryKeys = {
  all: ['diary'] as const,
  day: (date: string) => ['diary', 'day', date] as const,
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
