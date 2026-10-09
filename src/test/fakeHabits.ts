import type {
  HabitDetails,
  HabitInput,
  HabitListItem,
  HabitOverview,
  HabitsGateway,
  OverviewQuery,
} from '@/features/habits/habitsGateway';
import type { DayOfWeek } from '@/features/habits/weekdays';

export interface FakeHabit {
  id: string;
  title: string;
  description?: string | null;
  schedule: DayOfWeek[];
  startDate: string;
  /** Days with a mark, `yyyy-MM-dd`. */
  completed: string[];
}

type Call = keyof HabitsGateway;

/**
 * An in-memory stand-in for the habits API, steered by the test (the backend's tests use the same
 * kind of hand-written fake). It keeps the habits and their marks, answers like the server
 * (ranges, creation order) and writes down every call.
 *
 * - `currentStreak` is a stand-in: the number of marks. The real rule lives in the backend; here
 *   it only has to *change* when a mark does, so a test can tell the screen asked for it again.
 * - `hold()` lets calls wait until `release()`, to look at the screen while a request is under way.
 * - `failNext()` makes the next call of that kind fail once.
 */
export function fakeHabits(initial: FakeHabit[] = []) {
  const habits = initial.map((habit) => ({
    ...habit,
    description: habit.description ?? null,
    completed: new Set(habit.completed),
  }));
  let created = 0;

  const calls = {
    list: 0,
    overview: [] as OverviewQuery[],
    details: [] as string[],
    create: [] as (HabitInput & { startDate: string })[],
    update: [] as { id: string; input: HabitInput }[],
    remove: [] as string[],
    /** `mark h-1 2026-10-07` / `unmark h-1 2026-10-07`, in the order the server saw them. */
    marks: [] as string[],
  };

  let gate: Promise<void> = Promise.resolve();
  const failures = new Map<Call, unknown[]>();

  async function enter(call: Call): Promise<void> {
    await gate;
    const queued = failures.get(call);
    if (queued?.length) throw queued.shift();
  }

  let marksRunning = 0;
  let mostMarksAtOnce = 0;

  /** A mark or un-mark request: written down, counted while it is under way, then applied. */
  async function trackMark(entry: string, call: Call, apply: () => void): Promise<void> {
    calls.marks.push(entry);
    marksRunning++;
    mostMarksAtOnce = Math.max(mostMarksAtOnce, marksRunning);
    try {
      await enter(call);
      apply();
    } finally {
      marksRunning--;
    }
  }

  function find(id: string) {
    const habit = habits.find((candidate) => candidate.id === id);
    if (!habit) throw new Error(`fakeHabits: no habit ${id}`);
    return habit;
  }

  const gateway: HabitsGateway = {
    list: async () => {
      calls.list++;
      await enter('list');
      return habits.map<HabitListItem>((habit) => ({
        id: habit.id,
        title: habit.title,
        description: habit.description,
        schedule: habit.schedule,
      }));
    },

    overview: async (query) => {
      calls.overview.push(query);
      await enter('overview');
      return habits.map<HabitOverview>((habit) => ({
        id: habit.id,
        title: habit.title,
        schedule: habit.schedule,
        startDate: habit.startDate,
        completedDates: [...habit.completed]
          .filter((day) => day >= query.from && day <= query.to)
          .sort(),
        currentStreak: habit.completed.size,
      }));
    },

    details: async (id) => {
      calls.details.push(id);
      await enter('details');
      const habit = find(id);
      return {
        id: habit.id,
        title: habit.title,
        description: habit.description,
        schedule: habit.schedule,
        startDate: habit.startDate,
        createdAt: '2026-10-01T08:00:00Z',
      } satisfies HabitDetails;
    },

    create: async (input) => {
      calls.create.push(input);
      await enter('create');
      const habit = {
        id: `new-${++created}`,
        title: input.title,
        description: input.description,
        schedule: input.schedule,
        startDate: input.startDate,
        completed: new Set<string>(),
      };
      habits.push(habit);
      return {
        id: habit.id,
        title: habit.title,
        schedule: habit.schedule,
        startDate: input.startDate,
      };
    },

    update: async (id, input) => {
      calls.update.push({ id, input });
      await enter('update');
      Object.assign(find(id), input);
    },

    remove: async (id) => {
      calls.remove.push(id);
      await enter('remove');
      habits.splice(habits.indexOf(find(id)), 1);
    },

    mark: async (habitId, date) => {
      await trackMark(`mark ${habitId} ${date}`, 'mark', () => find(habitId).completed.add(date));
    },

    unmark: async (habitId, date) => {
      await trackMark(`unmark ${habitId} ${date}`, 'unmark', () =>
        find(habitId).completed.delete(date),
      );
    },
  };

  return {
    gateway,
    calls,

    /** The marks the "server" holds for a habit. */
    marksOf: (id: string) => [...find(id).completed].sort(),

    /** The most mark/un-mark requests that were under way at the same moment. */
    mostMarksAtOnce: () => mostMarksAtOnce,

    /** Calls made from now on wait until the returned function is called. */
    hold(): () => void {
      let release!: () => void;
      gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      return release;
    },

    /** The next call of this kind (`'mark'`, `'overview'`, …) rejects with `error`, once. */
    failNext(call: Call, error: unknown): void {
      failures.set(call, [...(failures.get(call) ?? []), error]);
    },
  };
}
