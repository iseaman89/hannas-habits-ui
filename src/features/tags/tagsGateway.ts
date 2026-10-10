import { ApiError, api, type Schema, type TypedApi } from '@/shared/api';

/** A tag of the list, with how often it is used (the suggestion list and the manage dialog). */
export type Tag = Schema<'TagDto'>;
/** A tag as a day carries it: just what is needed to show it and to take it off again. */
export type TagSummary = Schema<'TagSummaryDto'>;
export type RenamedTag = Schema<'RenamedTagDto'>;
export type DeletedTag = Schema<'DeletedTagDto'>;

/**
 * The calls for a person's own tags (the labels). Putting a tag on a habit's day is a call about
 * the habit and lives in the habits feature.
 */
export interface TagsGateway {
  /**
   * Every tag of the person. With `habitId` the list is ordered for that habit (the tags used on
   * its own days first), which is the order a suggestion list wants.
   */
  list: (habitId?: string, signal?: AbortSignal) => Promise<Tag[]>;
  /**
   * Get-or-create: a name that exists already (ignoring case) answers with that tag, so creating
   * on the fly cannot fail on a stale list. Use the returned name, not the typed one.
   */
  create: (name: string) => Promise<TagSummary>;
  /** A name another tag has merges the two: the answer says so, and `id` is the survivor's. */
  rename: (id: string, name: string) => Promise<RenamedTag>;
  /** Takes the tag off every day. A tag that is gone already is not an error. */
  remove: (id: string) => Promise<DeletedTag>;
}

export function createTagsGateway(client: TypedApi): TagsGateway {
  return {
    list: (habitId, signal) =>
      client.get('/api/tags', { query: habitId === undefined ? undefined : { habitId }, signal }),

    create: (name) => client.post('/api/tags', { body: { name } }),

    rename: (id, name) => client.put('/api/tags/{id}', { path: { id }, body: { name } }),

    remove: async (id) => {
      try {
        return await client.delete('/api/tags/{id}', { path: { id } });
      } catch (error) {
        // 404: another device removed it first. The tag is gone, which is what was asked for.
        if (error instanceof ApiError && error.status === 404) return { removedFromDays: 0 };
        throw error;
      }
    },
  };
}

/** The gateway of the running app. */
export const tagsGateway = createTagsGateway(api);
