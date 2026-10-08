import { ApiError, api, type Schema, type TypedApi } from '@/shared/api';
import { inPageExclusive, type Exclusive } from '@/shared/lib/exclusive';
import type { DiaryDocument, SaveDiaryRequest } from './diaryDraft';

/** A day that has an entry: just the date and the mood, which is all the calendar needs. */
export type DiaryDay = Schema<'DailyDiaryDayDto'>;

/** The first and last day of a range, both included. */
export interface DateRange {
  from: string;
  to: string;
}

/** The calls the diary and the calendar make. Dates are `yyyy-MM-dd`. */
export interface DiaryGateway {
  /** The day as the server has it, or `null` when nothing was written for it yet. */
  load: (date: string, signal?: AbortSignal) => Promise<DiaryDocument | null>;
  /** Replaces the whole day. An empty document removes the entry. */
  save: (date: string, request: SaveDiaryRequest) => Promise<void>;
  /** The days inside the range that have an entry, oldest first. A day without one is not in the list. */
  days: (range: DateRange, signal?: AbortSignal) => Promise<DiaryDay[]>;
}

export function createDiaryGateway(client: TypedApi): DiaryGateway {
  // Writes of one day go out one after the other. The editor already sends one at a time, but
  // a person who leaves a day and comes back has a second editor for it while the first one's
  // last write may still be on its way - and the older write must not land last.
  const writeQueues = new Map<string, Exclusive>();
  const queueOf = (date: string): Exclusive => {
    let queue = writeQueues.get(date);
    if (!queue) {
      queue = inPageExclusive();
      writeQueues.set(date, queue);
    }
    return queue;
  };

  return {
    load: async (date, signal) => {
      try {
        return await client.get('/api/daily-diaries/{date}', { path: { date }, signal });
      } catch (error) {
        // 404 is the contract's "nothing written for this day yet", not a failure: the screen
        // shows an empty day.
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },

    days: (range, signal) => client.get('/api/daily-diaries', { query: range, signal }),

    save: (date, request) =>
      queueOf(date)(() =>
        client.put('/api/daily-diaries/{date}', { path: { date }, body: request }),
      ),
  };
}

/** The gateway of the running app. */
export const diaryGateway = createDiaryGateway(api);
