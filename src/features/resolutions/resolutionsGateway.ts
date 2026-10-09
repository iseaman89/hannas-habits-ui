import { ApiError, api, type Schema, type TypedApi } from '@/shared/api';

export type Resolution = Schema<'ResolutionDto'>;

/** What a person fills in. No habit is an explicit `null`: leaving it out would remove the link as well, but says less. */
export interface ResolutionInput {
  title: string;
  habitId: string | null;
}

/** The whole item, as `PUT` wants it: `kept` is required and a missing `habitId` removes the link. */
export interface ResolutionChange extends ResolutionInput {
  kept: boolean;
}

/** The calls the resolutions screen makes. The year is part of every route; an item is `year` + `id`. */
export interface ResolutionsGateway {
  /** The year's resolutions in creation order; an empty list for a year without any. */
  list: (year: number, signal?: AbortSignal) => Promise<Resolution[]>;
  /** Appends a resolution (not kept) and returns it, with the title of the habit it points to. */
  add: (year: number, input: ResolutionInput) => Promise<Resolution>;
  /** Replaces the whole item - also how it is marked kept or open again. */
  update: (year: number, id: string, change: ResolutionChange) => Promise<void>;
  /** Removes the item. One that is gone already is not an error: it is what was asked for. */
  remove: (year: number, id: string) => Promise<void>;
}

export function createResolutionsGateway(client: TypedApi): ResolutionsGateway {
  return {
    list: (year, signal) => client.get('/api/resolutions/{year}', { path: { year }, signal }),

    add: (year, input) =>
      client.post('/api/resolutions/{year}/items', { path: { year }, body: input }),

    update: (year, id, change) =>
      client.put('/api/resolutions/{year}/items/{id}', { path: { year, id }, body: change }),

    remove: async (year, id) => {
      try {
        await client.delete('/api/resolutions/{year}/items/{id}', { path: { year, id } });
      } catch (error) {
        // 404: another device (or tab) removed it first. The item is gone, which is the end state
        // that was asked for - a second click must not look like a failure.
        if (error instanceof ApiError && error.status === 404) return;
        throw error;
      }
    },
  };
}

/** The gateway of the running app. */
export const resolutionsGateway = createResolutionsGateway(api);
