import type { DiaryDocument, SaveDiaryRequest } from '@/features/diary/diaryDraft';
import type { DateRange, DiaryGateway } from '@/features/diary/diaryGateway';

type Call = keyof DiaryGateway;

/** A day nobody wrote anything into, as the server would answer for one that has an entry. */
export function diaryDay(
  date: string,
  fields: Partial<Omit<DiaryDocument, 'date'>> = {},
): DiaryDocument {
  return {
    date,
    mood: null,
    body: null,
    mind: null,
    highlight: null,
    grateful: [],
    learned: [],
    tasks: [],
    ...fields,
  };
}

/** The server's rule: a document with nothing in it is not an entry. */
function isEmpty(request: SaveDiaryRequest): boolean {
  return (
    request.mood == null &&
    request.body == null &&
    request.mind == null &&
    !request.highlight?.trim() &&
    !request.grateful?.length &&
    !request.learned?.length &&
    !request.tasks?.length
  );
}

/**
 * An in-memory stand-in for the diary API, steered by the test (like `fakeHabits`). It keeps the
 * days, answers like the server (404 as `null`, an empty `PUT` removes the entry, a `PUT`
 * replaces the whole day, the list of days is built from the same days, oldest first, ends
 * included) and writes down every call.
 *
 * - `hold()` lets calls wait until `release()`, to look at the screen while a request is on its way.
 * - `failNext()` makes the next call of that kind fail once.
 * - `mostSavesAtOnce()` is how many saves were under way at the same moment.
 */
export function fakeDiary(initial: DiaryDocument[] = []) {
  const days = new Map(initial.map((day) => [day.date, day]));

  const calls = {
    load: [] as string[],
    /** The ranges asked for by `days`, in order. */
    days: [] as DateRange[],
    /** The requests that reached the "server", in order. */
    save: [] as { date: string; request: SaveDiaryRequest }[],
  };

  let gate: Promise<void> = Promise.resolve();
  const failures = new Map<Call, unknown[]>();

  async function enter(call: Call): Promise<void> {
    await gate;
    const queued = failures.get(call);
    if (queued?.length) throw queued.shift();
  }

  let savesRunning = 0;
  let mostSavesAtOnce = 0;

  const gateway: DiaryGateway = {
    load: async (date) => {
      calls.load.push(date);
      await enter('load');
      return days.get(date) ?? null;
    },

    days: async (range) => {
      calls.days.push(range);
      await enter('days');
      return [...days.values()]
        .filter((day) => day.date >= range.from && day.date <= range.to)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((day) => ({ date: day.date, mood: day.mood }));
    },

    save: async (date, request) => {
      calls.save.push({ date, request });
      savesRunning++;
      mostSavesAtOnce = Math.max(mostSavesAtOnce, savesRunning);
      try {
        await enter('save');
        if (isEmpty(request)) {
          days.delete(date);
          return;
        }
        days.set(date, {
          date,
          mood: request.mood ?? null,
          body: request.body ?? null,
          mind: request.mind ?? null,
          highlight: request.highlight?.trim() || null,
          grateful: request.grateful ?? [],
          learned: request.learned ?? [],
          tasks: request.tasks ?? [],
        });
      } finally {
        savesRunning--;
      }
    },
  };

  return {
    gateway,
    calls,

    /** The day as the "server" holds it now, or `undefined` when there is no entry. */
    dayOf: (date: string) => days.get(date),

    mostSavesAtOnce: () => mostSavesAtOnce,

    /** Calls made from now on wait until the returned function is called. */
    hold(): () => void {
      let release!: () => void;
      gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      return release;
    },

    /** The next call of this kind (`'load'`, `'save'`, `'days'`) rejects with `error`, once. */
    failNext(call: Call, error: unknown): void {
      failures.set(call, [...(failures.get(call) ?? []), error]);
    },
  };
}
