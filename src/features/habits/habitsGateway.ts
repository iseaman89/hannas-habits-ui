import { ApiError, api, type Schema, type TypedApi } from '@/shared/api';
import type { RecurrenceRequest } from './recurrence';
import type { DayOfWeek } from './weekdays';

export type HabitOverview = Schema<'HabitOverviewDto'>;
export type HabitDetails = Schema<'HabitDetailsDto'>;
/** A habit as the plain list has it: enough to choose one by its title. */
export type HabitListItem = Schema<'HabitListItemDto'>;
export type CreatedHabit = Schema<'CreateHabitDto'>;
/** One habit's day with the tags it carries, as the server answers after a change. */
export type TaggedDay = Schema<'TaggedDayDto'>;
/** A part of a habit as the server holds it: its title and the weekdays it is planned on. */
export type SubHabitDetails = Schema<'SubHabitDto'>;

/**
 * The range and the "today" of an overview. Optional in the OpenAPI document, but the server
 * answers 400 without `from` and `to`, and `asOf` must be the client's today (the server's own
 * date can be a day off): so the screen always sends all three.
 */
export interface OverviewQuery {
  from: string;
  to: string;
  asOf: string;
}

/**
 * What a person fills in. Leaving `description` out would clear it, so blank is an explicit
 * `null`. `startDate` (`yyyy-MM-dd`) is the first day the habit counts, in the client's local time.
 * `recurrence` is the rule that decides on which days the habit is due.
 */
export interface HabitInput {
  title: string;
  description: string | null;
  recurrence: RecurrenceRequest;
  startDate: string;
}

/**
 * What a person fills in for a part. Both are sent every time: a part is replaced as a whole, and
 * the weekdays must be days the habit itself is planned on.
 */
export interface SubHabitInput {
  title: string;
  weekdays: DayOfWeek[];
}

/** The calls the habits screen makes. Dates are `yyyy-MM-dd`. */
export interface HabitsGateway {
  /** Every habit, in creation order - for a picker; no dates, no marks, no streak. */
  list: (signal?: AbortSignal) => Promise<HabitListItem[]>;
  overview: (query: OverviewQuery, signal?: AbortSignal) => Promise<HabitOverview[]>;
  /** One habit with the fields the overview leaves out (the description). */
  details: (id: string, signal?: AbortSignal) => Promise<HabitDetails>;
  create: (input: HabitInput) => Promise<CreatedHabit>;
  /** The whole habit, including the start date (earlier marks stay, wherever it is moved). */
  update: (id: string, input: HabitInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Marks the day as done. Idempotent on the server. */
  mark: (habitId: string, date: string) => Promise<void>;
  /** Takes the mark back. A day that is not marked is already what was asked for, not an error. */
  unmark: (habitId: string, date: string) => Promise<void>;
  /**
   * Puts a tag on the day, independent of the done mark. Idempotent; answers with the day's tags
   * after the call, which is the truth even when another device changed the day meanwhile.
   */
  tagDay: (habitId: string, date: string, tagId: string) => Promise<TaggedDay>;
  /** Takes a tag off the day. Idempotent, same answer as `tagDay`. */
  untagDay: (habitId: string, date: string, tagId: string) => Promise<TaggedDay>;
  /** A new part of the habit, planned on some of its weekdays. Answers with the part. */
  addSubHabit: (habitId: string, input: SubHabitInput) => Promise<SubHabitDetails>;
  /** The whole part: a new title and / or other weekdays. Its ticks stay. */
  updateSubHabit: (
    habitId: string,
    subHabitId: string,
    input: SubHabitInput,
  ) => Promise<SubHabitDetails>;
  /** Removes the part with its ticks; the habit's own days stay. A part that is gone is not an error. */
  removeSubHabit: (habitId: string, subHabitId: string) => Promise<void>;
  /**
   * Ticks a part on a day. Idempotent on the server, which also completes the habit's day when
   * this was the last due part. The answer (the day after the call) is not used: the screen asks
   * for the overview again, like after a habit's own tick.
   */
  markSubHabit: (habitId: string, subHabitId: string, date: string) => Promise<void>;
  /** Takes a part's tick back. A tick that is not there is already what was asked for. */
  unmarkSubHabit: (habitId: string, subHabitId: string, date: string) => Promise<void>;
}

export function createHabitsGateway(client: TypedApi): HabitsGateway {
  return {
    list: (signal) => client.get('/api/habits', { signal }),

    overview: (query, signal) => client.get('/api/habits/overview', { query, signal }),

    details: (id, signal) => client.get('/api/habits/{id}', { path: { id }, signal }),

    create: (input) => client.post('/api/habits', { body: input }),

    update: (id, input) => client.put('/api/habits/{id}', { path: { id }, body: input }),

    remove: (id) => client.delete('/api/habits/{id}', { path: { id } }),

    mark: async (habitId, date) => {
      await client.put('/api/habits/{habitId}/records/{date}', { path: { habitId, date } });
    },

    unmark: async (habitId, date) => {
      try {
        await client.delete('/api/habits/{habitId}/records/{date}', { path: { habitId, date } });
      } catch (error) {
        // The server answers 404 for a day without a mark (and for a habit that is gone). Either
        // way the day is not marked, which is the end state the person asked for - and a second
        // click on a cell that another device already cleared must not look like a failure.
        if (error instanceof ApiError && error.status === 404) return;
        throw error;
      }
    },

    tagDay: (habitId, date, tagId) =>
      client.put('/api/habits/{habitId}/days/{date}/tags/{tagId}', {
        path: { habitId, date, tagId },
      }),

    untagDay: (habitId, date, tagId) =>
      client.delete('/api/habits/{habitId}/days/{date}/tags/{tagId}', {
        path: { habitId, date, tagId },
      }),

    addSubHabit: (habitId, input) =>
      client.post('/api/habits/{habitId}/sub-habits', { path: { habitId }, body: input }),

    updateSubHabit: (habitId, subHabitId, input) =>
      client.put('/api/habits/{habitId}/sub-habits/{subHabitId}', {
        path: { habitId, subHabitId },
        body: input,
      }),

    removeSubHabit: async (habitId, subHabitId) => {
      try {
        await client.delete('/api/habits/{habitId}/sub-habits/{subHabitId}', {
          path: { habitId, subHabitId },
        });
      } catch (error) {
        // Gone already (another device, another tab): that is the end state that was asked for.
        if (error instanceof ApiError && error.status === 404) return;
        throw error;
      }
    },

    markSubHabit: async (habitId, subHabitId, date) => {
      await client.put('/api/habits/{habitId}/sub-habits/{subHabitId}/records/{date}', {
        path: { habitId, subHabitId, date },
      });
    },

    unmarkSubHabit: async (habitId, subHabitId, date) => {
      try {
        await client.delete('/api/habits/{habitId}/sub-habits/{subHabitId}/records/{date}', {
          path: { habitId, subHabitId, date },
        });
      } catch (error) {
        // Like a habit's own un-mark: a tick that is not there (or a part that is gone) is not
        // marked, which is what the person asked for.
        if (error instanceof ApiError && error.status === 404) return;
        throw error;
      }
    },
  };
}

/** The gateway of the running app. */
export const habitsGateway = createHabitsGateway(api);
