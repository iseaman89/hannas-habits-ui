import { ApiError, api, type Schema, type TypedApi } from '@/shared/api';
import type { DayOfWeek } from './weekdays';

export type HabitOverview = Schema<'HabitOverviewDto'>;
export type HabitDetails = Schema<'HabitDetailsDto'>;
export type CreatedHabit = Schema<'CreateHabitDto'>;

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

/** What a person fills in. Leaving `description` out would clear it, so blank is an explicit `null`. */
export interface HabitInput {
  title: string;
  description: string | null;
  schedule: DayOfWeek[];
}

/** The calls the habits screen makes. Dates are `yyyy-MM-dd`. */
export interface HabitsGateway {
  overview: (query: OverviewQuery, signal?: AbortSignal) => Promise<HabitOverview[]>;
  /** One habit with the fields the overview leaves out (the description). */
  details: (id: string, signal?: AbortSignal) => Promise<HabitDetails>;
  /** `startDate` is the client's local today: the first day the habit counts. */
  create: (input: HabitInput & { startDate: string }) => Promise<CreatedHabit>;
  /** The whole habit; the start date cannot be changed. */
  update: (id: string, input: HabitInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Marks the day as done. Idempotent on the server. */
  mark: (habitId: string, date: string) => Promise<void>;
  /** Takes the mark back. A day that is not marked is already what was asked for, not an error. */
  unmark: (habitId: string, date: string) => Promise<void>;
}

export function createHabitsGateway(client: TypedApi): HabitsGateway {
  return {
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
  };
}

/** The gateway of the running app. */
export const habitsGateway = createHabitsGateway(api);
