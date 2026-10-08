import type {
  Resolution,
  ResolutionChange,
  ResolutionInput,
  ResolutionsGateway,
} from '@/features/resolutions/resolutionsGateway';
import { apiError } from './problems';

export interface FakeResolution {
  id: string;
  year: number;
  title: string;
  kept?: boolean;
  /** The habit it is tracked by; must be a key of the fake's `habits` to count as one. */
  habitId?: string | null;
}

type Call = keyof ResolutionsGateway;

/**
 * An in-memory stand-in for the resolutions API, steered by the test (like `fakeHabits`). It keeps
 * the items per year in creation order and answers like the server: a habit link resolves to the
 * habit's *current* title, a link to a habit that is gone (not in `habits`) comes back as none -
 * the `ON DELETE SET NULL` of the real database - and a link to a habit that never existed is a
 * 400 on `habitId`.
 *
 * - `habits` maps habit ids to titles. Change it to rename or delete a habit "elsewhere".
 * - `hold()` lets calls wait until `release()`; `failNext()` makes the next call of that kind fail.
 */
export function fakeResolutions(
  initial: FakeResolution[] = [],
  habits: Record<string, string> = {},
) {
  const items = initial.map((item) => ({
    ...item,
    kept: item.kept ?? false,
    habitId: item.habitId ?? null,
  }));
  let created = 0;

  const calls = {
    /** The years that were asked for. */
    list: [] as number[],
    add: [] as { year: number; input: ResolutionInput }[],
    update: [] as { year: number; id: string; change: ResolutionChange }[],
    remove: [] as { year: number; id: string }[],
  };

  let gate: Promise<void> = Promise.resolve();
  const failures = new Map<Call, unknown[]>();

  async function enter(call: Call): Promise<void> {
    await gate;
    const queued = failures.get(call);
    if (queued?.length) throw queued.shift();
  }

  let writesRunning = 0;
  let mostWritesAtOnce = 0;

  /** An update or delete: counted while it is under way, so a test can see whether they overlap. */
  async function trackWrite(call: Call, apply: () => void): Promise<void> {
    writesRunning++;
    mostWritesAtOnce = Math.max(mostWritesAtOnce, writesRunning);
    try {
      await enter(call);
      apply();
    } finally {
      writesRunning--;
    }
  }

  const exists = (habitId: string | null) => habitId === null || habitId in habits;

  function dto(item: (typeof items)[number]): Resolution {
    // A habit that is gone takes its link with it.
    const linked = item.habitId !== null && item.habitId in habits;
    return {
      id: item.id,
      title: item.title,
      kept: item.kept,
      habitId: linked ? item.habitId : null,
      habitTitle: linked && item.habitId !== null ? (habits[item.habitId] ?? null) : null,
    };
  }

  function rejectUnknownHabit(habitId: string | null) {
    if (!exists(habitId)) {
      throw apiError(400, {
        title: 'One or more validation errors occurred.',
        fieldErrors: { habitId: ['The habit does not exist.'] },
      });
    }
  }

  const gateway: ResolutionsGateway = {
    list: async (year) => {
      calls.list.push(year);
      await enter('list');
      return items.filter((item) => item.year === year).map(dto);
    },

    add: async (year, input) => {
      calls.add.push({ year, input });
      await enter('add');
      rejectUnknownHabit(input.habitId);
      const item = {
        id: `new-${++created}`,
        year,
        title: input.title,
        kept: false,
        habitId: input.habitId,
      };
      items.push(item);
      return dto(item);
    },

    update: async (year, id, change) => {
      calls.update.push({ year, id, change });
      await trackWrite('update', () => {
        const item = items.find((candidate) => candidate.id === id && candidate.year === year);
        if (!item) throw apiError(404, { title: 'Not Found' });
        rejectUnknownHabit(change.habitId);
        Object.assign(item, change);
      });
    },

    remove: async (year, id) => {
      calls.remove.push({ year, id });
      await trackWrite('remove', () => {
        const index = items.findIndex((item) => item.id === id && item.year === year);
        if (index >= 0) items.splice(index, 1);
      });
    },
  };

  return {
    gateway,
    calls,
    /** Habit id → title. Edit it to rename a habit or to delete one behind the screen's back. */
    habits,

    /** What the "server" holds for a year now, in creation order. */
    itemsOf: (year: number): Resolution[] => items.filter((item) => item.year === year).map(dto),

    /** The most updates/deletes that were under way at the same moment. */
    mostWritesAtOnce: () => mostWritesAtOnce,

    /** Calls made from now on wait until the returned function is called. */
    hold(): () => void {
      let release!: () => void;
      gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      return release;
    },

    /** The next call of this kind (`'update'`, `'list'`, …) rejects with `error`, once. */
    failNext(call: Call, error: unknown): void {
      failures.set(call, [...(failures.get(call) ?? []), error]);
    },
  };
}
