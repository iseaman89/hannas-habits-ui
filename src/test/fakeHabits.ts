import type {
  HabitDetails,
  HabitInput,
  HabitListItem,
  HabitOverview,
  HabitStatistics,
  HabitsGateway,
  OverviewQuery,
  SubHabitInput,
} from '@/features/habits/habitsGateway';
import type { DayOfWeek } from '@/features/habits/weekdays';
import { eachDayOfInterval, format, parseISO } from 'date-fns';
import { apiError } from './problems';
import {
  isDue,
  plannedWeekdays,
  quotaPeriodsOf,
  recurrenceOf,
  weeklyRecurrence,
  type Recurrence,
} from './recurrence';
import {
  daysBetween,
  lastDoneUpTo,
  streaksOfDays,
  streaksOfPeriods,
  tallyDays,
  tallyPeriods,
  unitOf,
} from './statistics';
import { createTagBook, type TagBook } from './tagBook';

/** A part of a habit, as a test describes it. */
export interface FakeSubHabit {
  id: string;
  title: string;
  weekdays: DayOfWeek[];
  /** Days with a tick, `yyyy-MM-dd`. */
  completed?: string[];
  /** Notes by day, `yyyy-MM-dd`. */
  notes?: Record<string, string>;
}

/** `Habit.MaxSubHabits`, the title limit and `SubHabitNote.TextMaxLength` of the backend. */
const MAX_PARTS = 10;
const MAX_TITLE = 150;
const MAX_NOTE = 500;

export interface FakeHabit {
  id: string;
  title: string;
  description?: string | null;
  /** Shorthand for a rule: every week on these days. */
  weekdays?: DayOfWeek[];
  /** Any rule; it wins over `weekdays`. One of the two is needed. */
  recurrence?: Recurrence;
  startDate: string;
  /** Days with a mark, `yyyy-MM-dd`. */
  completed: string[];
  /** The habit's parts, in the order they were added. */
  subHabits?: FakeSubHabit[];
}

type Call = keyof HabitsGateway;

/**
 * An in-memory stand-in for the habits API, steered by the test (the backend's tests use the same
 * kind of hand-written fake). It keeps the habits and their marks, answers like the server
 * (ranges, creation order) and writes down every call.
 *
 * - `statistics` counts like the backend's `HabitStatistics` (due days up to `asOf`, an open today
 *   is no miss, a quota in whole weeks / months ending in the range) and `HabitStreak` (the streak
 *   and the longest one, over the whole history), pinned by `fakeHabits.statistics.test.ts`.
 * - `currentStreak` is a stand-in: the number of marks. The real rule lives in the backend; here
 *   it only has to *change* when a mark does, so a test can tell the screen asked for it again.
 * - Tags on days live in the `tagBook` (pass one in to share it with `fakeTags`).
 * - Parts (sub-habits) follow the server's rules: at most 10 per habit, a title once per habit
 *   (ignoring case), days only from the habit's own, due where the habit is due *and* the weekday
 *   matches, and the habit's day follows its due parts (ticking the habit ticks them, un-ticking
 *   it clears them, the last due part completes the day, un-ticking one takes it back).
 * - Notes of a part on a day follow the server's rules: one per day, written trimmed, a blank text
 *   is a 400 on `text` (taking one away is `clearSubHabitNote`), at most 500 characters, independent
 *   of the ticks, gone with the part.
 * - `hold()` lets calls wait until `release()`, to look at the screen while a request is under way.
 * - `failNext()` makes the next call of that kind fail once.
 */
export function fakeHabits(
  initial: FakeHabit[] = [],
  { tagBook = createTagBook() }: { tagBook?: TagBook } = {},
) {
  // What the server answers in `scheduledDates`: the days of the range the habit is due on, none
  // before the start date.
  const scheduledDates = (
    habit: { recurrence: Recurrence; startDate: string },
    query: OverviewQuery,
  ) =>
    eachDayOfInterval({ start: parseISO(query.from), end: parseISO(query.to) })
      .map((day) => format(day, 'yyyy-MM-dd'))
      .filter((day) => day >= habit.startDate && isDue(habit.recurrence, day));

  interface Part {
    id: string;
    title: string;
    weekdays: DayOfWeek[];
    completed: Set<string>;
    notes: Map<string, string>;
  }

  const habits = initial.map(({ weekdays, recurrence, subHabits = [], ...habit }) => {
    if (!recurrence && !weekdays) throw new Error(`fakeHabits: ${habit.id} has no rule`);
    return {
      ...habit,
      description: habit.description ?? null,
      recurrence: recurrence ?? weeklyRecurrence(weekdays ?? []),
      completed: new Set(habit.completed),
      parts: subHabits.map<Part>(({ notes, ...part }) => ({
        ...part,
        completed: new Set(part.completed ?? []),
        notes: new Map(Object.entries(notes ?? {})),
      })),
    };
  });
  type FakeHabitState = (typeof habits)[number];
  let created = 0;
  let createdParts = 0;

  /** Is the part due on the day: the habit is (from its start on) and the weekday is the part's. */
  const partIsDue = (habit: FakeHabitState, part: Part, day: string) =>
    day >= habit.startDate &&
    isDue(habit.recurrence, day) &&
    part.weekdays.includes(parseISO(day).getDay() as DayOfWeek);

  const partsDueOn = (habit: FakeHabitState, day: string) =>
    habit.parts.filter((part) => partIsDue(habit, part, day));

  /** The server's checks of a part's request: its validator first, then the aggregate's rules. */
  function checkPart(
    habit: FakeHabitState,
    input: SubHabitInput,
    except: Part | null,
  ): { title: string } {
    const title = input.title.trim();
    if (title === '')
      throw apiError(400, { fieldErrors: { title: ['The title must not be empty.'] } });
    if (title.length > MAX_TITLE)
      throw apiError(400, { fieldErrors: { title: [`At most ${MAX_TITLE} characters.`] } });
    if (input.weekdays.length === 0)
      throw apiError(400, { fieldErrors: { weekdays: ['At least one weekday.'] } });

    if (!except && habit.parts.length >= MAX_PARTS)
      throw apiError(400, { detail: `A habit can have at most ${MAX_PARTS} sub-habits.` });
    if (
      habit.parts.some(
        (part) => part !== except && part.title.toLowerCase() === title.toLowerCase(),
      )
    )
      throw apiError(400, { detail: `The habit already has a sub-habit called '${title}'.` });

    // Weekdays are checked only where they change, so a part that fell out of step can be renamed.
    const changed =
      !except || [...input.weekdays].sort().join() !== [...except.weekdays].sort().join();
    const planned = plannedWeekdays(habit.recurrence);
    if (changed && !input.weekdays.every((day) => planned.includes(day)))
      throw apiError(400, {
        detail: 'A sub-habit can only be planned on days the habit itself is planned on.',
      });

    return { title };
  }

  const calls = {
    list: 0,
    overview: [] as OverviewQuery[],
    statistics: [] as OverviewQuery[],
    details: [] as string[],
    create: [] as HabitInput[],
    update: [] as { id: string; input: HabitInput }[],
    remove: [] as string[],
    /** `mark h-1 2026-10-07` / `unmark h-1 2026-10-07`, in the order the server saw them. */
    marks: [] as string[],
    /** `tag h-1 2026-10-07 tag-1` / `untag …`, in the order the server saw them. */
    tags: [] as string[],
    /**
     * `add h-1 Legs` / `update h-1 part-1 Legs` / `remove h-1 part-1`, in the order the server saw
     * them. Ticks of a part are in `marks` (`mark-part h-1 part-1 2026-10-07` / `unmark-part …`):
     * a habit's tick and a part's tick must reach the server in the order of the clicks.
     */
    parts: [] as string[],
    /** `set h-1 part-1 2026-10-07 text` / `clear h-1 part-1 2026-10-07`, in the order the server saw them. */
    notes: [] as string[],
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
        recurrence: habit.recurrence,
      }));
    },

    overview: async (query) => {
      calls.overview.push(query);
      await enter('overview');
      return habits.map<HabitOverview>((habit) => ({
        id: habit.id,
        title: habit.title,
        recurrence: habit.recurrence,
        startDate: habit.startDate,
        scheduledDates: scheduledDates(habit, query),
        completedDates: [...habit.completed]
          .filter((day) => day >= query.from && day <= query.to)
          .sort(),
        taggedDays: tagBook.taggedDays(habit.id, query.from, query.to),
        quotaPeriods: quotaPeriodsOf(
          habit.recurrence,
          habit.startDate,
          habit.completed,
          query.from,
          query.to,
        ),
        currentStreak: habit.completed.size,
        subHabits: habit.parts.map((part) => ({
          id: part.id,
          title: part.title,
          weekdays: [...part.weekdays],
          scheduledDates: scheduledDates(habit, query).filter((day) => partIsDue(habit, part, day)),
          completedDates: [...part.completed]
            .filter((day) => day >= query.from && day <= query.to)
            .sort(),
          notes: [...part.notes]
            .filter(([day]) => day >= query.from && day <= query.to)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, text]) => ({ date, text })),
        })),
      }));
    },

    statistics: async (query) => {
      calls.statistics.push(query);
      await enter('statistics');

      return habits.map<HabitStatistics>((habit) => {
        const quota = unitOf(habit.recurrence) !== 'days';
        // The due days up to "today"; a day after it is not judged yet.
        const horizon = query.to < query.asOf ? query.to : query.asOf;
        const dueDays = daysBetween(query.from, horizon).filter(
          (day) => day >= habit.startDate && isDue(habit.recurrence, day),
        );
        const tally = quota
          ? tallyPeriods(habit.recurrence, habit.startDate, habit.completed, query)
          : tallyDays(dueDays, habit.completed, query.asOf);
        // The streaks look at the whole history up to "today", whatever the range.
        const history = daysBetween(habit.startDate, query.asOf).filter((day) =>
          isDue(habit.recurrence, day),
        );
        const streaks = quota
          ? streaksOfPeriods(habit.recurrence, habit.startDate, habit.completed, query.asOf)
          : streaksOfDays(history, habit.completed, query.asOf);

        return {
          id: habit.id,
          title: habit.title,
          recurrence: habit.recurrence,
          startDate: habit.startDate,
          unit: unitOf(habit.recurrence),
          ...tally,
          lastDoneOn: lastDoneUpTo(habit.completed, query.asOf),
          ...streaks,
          subHabits: habit.parts.map((part) => ({
            id: part.id,
            title: part.title,
            weekdays: [...part.weekdays],
            ...tallyDays(
              dueDays.filter((day) => partIsDue(habit, part, day)),
              part.completed,
              query.asOf,
            ),
            lastDoneOn: lastDoneUpTo(part.completed, query.asOf),
            ...streaksOfDays(
              history.filter((day) => partIsDue(habit, part, day)),
              part.completed,
              query.asOf,
            ),
          })),
        };
      });
    },

    details: async (id) => {
      calls.details.push(id);
      await enter('details');
      const habit = find(id);
      return {
        id: habit.id,
        title: habit.title,
        description: habit.description,
        recurrence: habit.recurrence,
        startDate: habit.startDate,
        createdAt: '2026-10-01T08:00:00Z',
        subHabits: habit.parts.map(({ id: partId, title, weekdays }) => ({
          id: partId,
          title,
          weekdays: [...weekdays],
        })),
      } satisfies HabitDetails;
    },

    create: async (input) => {
      calls.create.push(input);
      await enter('create');
      const habit = {
        id: `new-${++created}`,
        title: input.title,
        description: input.description,
        recurrence: recurrenceOf(input.recurrence, input.startDate),
        startDate: input.startDate,
        completed: new Set<string>(),
        parts: [] as Part[],
      };
      habits.push(habit);
      return {
        id: habit.id,
        title: habit.title,
        recurrence: habit.recurrence,
        startDate: input.startDate,
      };
    },

    update: async (id, input) => {
      calls.update.push({ id, input });
      await enter('update');
      const habit = find(id);
      habit.title = input.title;
      habit.description = input.description;
      habit.startDate = input.startDate;
      // Like the server: a rhythm without a day of its own counts from the start date as saved.
      habit.recurrence = recurrenceOf(input.recurrence, input.startDate);
    },

    remove: async (id) => {
      calls.remove.push(id);
      await enter('remove');
      habits.splice(habits.indexOf(find(id)), 1);
      tagBook.forgetHabit(id);
    },

    mark: async (habitId, date) => {
      await trackMark(`mark ${habitId} ${date}`, 'mark', () => {
        const habit = find(habitId);
        habit.completed.add(date);
        // "Did Sport" means all of the day's parts.
        for (const part of partsDueOn(habit, date)) part.completed.add(date);
      });
    },

    unmark: async (habitId, date) => {
      await trackMark(`unmark ${habitId} ${date}`, 'unmark', () => {
        const habit = find(habitId);
        habit.completed.delete(date);
        // A day that is not done has no part done (also one that was not due).
        for (const part of habit.parts) part.completed.delete(date);
      });
    },

    tagDay: async (habitId, date, tagId) => {
      calls.tags.push(`tag ${habitId} ${date} ${tagId}`);
      await enter('tagDay');
      find(habitId);
      return { date, tags: tagBook.attach(habitId, date, tagId) };
    },

    untagDay: async (habitId, date, tagId) => {
      calls.tags.push(`untag ${habitId} ${date} ${tagId}`);
      await enter('untagDay');
      find(habitId);
      return { date, tags: tagBook.detach(habitId, date, tagId) };
    },

    addSubHabit: async (habitId, input) => {
      calls.parts.push(`add ${habitId} ${input.title}`);
      await enter('addSubHabit');
      const habit = find(habitId);
      const { title } = checkPart(habit, input, null);
      const part: Part = {
        id: `part-${++createdParts}`,
        title,
        weekdays: [...input.weekdays],
        completed: new Set(),
        notes: new Map(),
      };
      habit.parts.push(part);
      return { id: part.id, title: part.title, weekdays: [...part.weekdays] };
    },

    updateSubHabit: async (habitId, subHabitId, input) => {
      calls.parts.push(`update ${habitId} ${subHabitId} ${input.title}`);
      await enter('updateSubHabit');
      const habit = find(habitId);
      const part = habit.parts.find((candidate) => candidate.id === subHabitId);
      if (!part) throw apiError(404, { title: 'Not found' });
      const { title } = checkPart(habit, input, part);
      part.title = title;
      part.weekdays = [...input.weekdays];
      return { id: part.id, title: part.title, weekdays: [...part.weekdays] };
    },

    removeSubHabit: async (habitId, subHabitId) => {
      calls.parts.push(`remove ${habitId} ${subHabitId}`);
      await enter('removeSubHabit');
      const habit = find(habitId);
      // Like the gateway: a part that is gone already is not an error.
      habit.parts = habit.parts.filter((part) => part.id !== subHabitId);
    },

    markSubHabit: async (habitId, subHabitId, date) => {
      await trackMark(`mark-part ${habitId} ${subHabitId} ${date}`, 'markSubHabit', () => {
        const habit = find(habitId);
        const part = habit.parts.find((candidate) => candidate.id === subHabitId);
        if (!part) throw apiError(404, { title: 'Not found' });
        part.completed.add(date);
        // The last due part completes the habit's day; a tick on a day it is not due is a mark only.
        const due = partsDueOn(habit, date);
        if (due.includes(part) && due.every((candidate) => candidate.completed.has(date)))
          habit.completed.add(date);
      });
    },

    unmarkSubHabit: async (habitId, subHabitId, date) => {
      await trackMark(`unmark-part ${habitId} ${subHabitId} ${date}`, 'unmarkSubHabit', () => {
        const habit = find(habitId);
        const part = habit.parts.find((candidate) => candidate.id === subHabitId);
        if (!part) return;
        part.completed.delete(date);
        if (partIsDue(habit, part, date)) habit.completed.delete(date);
      });
    },

    setSubHabitNote: async (habitId, subHabitId, date, text) => {
      calls.notes.push(`set ${habitId} ${subHabitId} ${date} ${text}`);
      await enter('setSubHabitNote');
      const habit = find(habitId);
      const part = habit.parts.find((candidate) => candidate.id === subHabitId);
      if (!part) throw apiError(404, { title: 'Not found' });

      const trimmed = text.trim();
      if (trimmed === '')
        throw apiError(400, { fieldErrors: { text: ['The note must not be empty.'] } });
      if (trimmed.length > MAX_NOTE)
        throw apiError(400, { fieldErrors: { text: [`At most ${MAX_NOTE} characters.`] } });

      part.notes.set(date, trimmed);
      return { date, text: trimmed };
    },

    clearSubHabitNote: async (habitId, subHabitId, date) => {
      calls.notes.push(`clear ${habitId} ${subHabitId} ${date}`);
      await enter('clearSubHabitNote');
      // Like the gateway: a part that is gone, and its notes with it, is not an error.
      find(habitId)
        .parts.find((candidate) => candidate.id === subHabitId)
        ?.notes.delete(date);
    },
  };

  return {
    gateway,
    calls,
    tagBook,

    /** The marks the "server" holds for a habit. */
    marksOf: (id: string) => [...find(id).completed].sort(),

    /** The parts the "server" holds for a habit, with their ticks. */
    partsOf: (id: string) =>
      find(id).parts.map(({ id: partId, title, weekdays, completed }) => ({
        id: partId,
        title,
        weekdays: [...weekdays],
        completed: [...completed].sort(),
      })),

    /** The notes the "server" holds for one part, oldest day first. */
    notesOf: (habitId: string, subHabitId: string) =>
      [...(find(habitId).parts.find((part) => part.id === subHabitId)?.notes ?? [])]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, text]) => ({ date, text })),

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
