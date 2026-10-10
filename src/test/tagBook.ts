import type { Tag, TagSummary } from '@/features/tags/tagsGateway';
import { apiError } from './problems';

const MAX_NAME = 30;
const MAX_PER_USER = 200;
const MAX_PER_DAY = 10;

interface Held {
  id: string;
  name: string;
}

/**
 * What the server keeps about tags: a person's labels and which of a habit's days carry which.
 * The habits fake (`fakeHabits`) and the tags fake (`fakeTags`) share one book, because on the
 * real server it is one store - a tag put on a day shows in both the overview and the list.
 *
 * The rules are the server's (B14): names are trimmed, 1..30, unique ignoring case; renaming to
 * an existing name merges; a day holds at most 10; a person at most 200 tags; the list is ordered
 * for a habit (its own use first, then overall use, then name).
 */
export function createTagBook(initial: Held[] = []) {
  const tags: Held[] = initial.map((tag) => ({ ...tag }));
  /** `habitId|date` -> tag ids */
  const days = new Map<string, Set<string>>();
  let made = 0;

  const key = (habitId: string, date: string) => `${habitId}|${date}`;
  const find = (id: string) => tags.find((tag) => tag.id === id);
  const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

  function summaries(ids: Iterable<string>): TagSummary[] {
    return [...ids]
      .map((id) => find(id))
      .filter((tag): tag is Held => tag !== undefined)
      .map(({ id, name }) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function cleanName(raw: string): string {
    const name = raw.trim();
    if (name === '') {
      throw apiError(400, { fieldErrors: { name: ['The name must not be empty.'] } });
    }
    if (name.length > MAX_NAME) {
      throw apiError(400, {
        fieldErrors: { name: [`The name must be at most ${MAX_NAME} characters.`] },
      });
    }
    return name;
  }

  const book = {
    tags,

    /** The tags of one day, by name. */
    dayTags(habitId: string, date: string): TagSummary[] {
      return summaries(days.get(key(habitId, date)) ?? []);
    },

    /** The overview's `taggedDays` of one habit for a range, oldest first. */
    taggedDays(habitId: string, from: string, to: string) {
      return [...days.entries()]
        .filter(([k, ids]) => k.startsWith(`${habitId}|`) && ids.size > 0)
        .map(([k]) => k.slice(habitId.length + 1))
        .filter((date) => date >= from && date <= to)
        .sort()
        .map((date) => ({ date, tags: book.dayTags(habitId, date) }));
    },

    /** Idempotent; returns the day's tags afterwards. */
    attach(habitId: string, date: string, tagId: string): TagSummary[] {
      if (!find(tagId)) throw apiError(404);
      const ids = days.get(key(habitId, date)) ?? new Set<string>();
      if (!ids.has(tagId) && ids.size >= MAX_PER_DAY) {
        throw apiError(400, { detail: `A day can have at most ${MAX_PER_DAY} tags.` });
      }
      ids.add(tagId);
      days.set(key(habitId, date), ids);
      return book.dayTags(habitId, date);
    },

    detach(habitId: string, date: string, tagId: string): TagSummary[] {
      if (!find(tagId)) throw apiError(404);
      const ids = days.get(key(habitId, date));
      ids?.delete(tagId);
      if (ids?.size === 0) days.delete(key(habitId, date));
      return book.dayTags(habitId, date);
    },

    list(habitId?: string): Tag[] {
      const count = (id: string, only?: string) =>
        [...days.entries()].filter(
          ([k, ids]) => ids.has(id) && (only === undefined || k.startsWith(`${only}|`)),
        );
      return tags
        .map((tag) => {
          const used = count(tag.id);
          return {
            id: tag.id,
            name: tag.name,
            useCount: used.length,
            habitUseCount: habitId === undefined ? 0 : count(tag.id, habitId).length,
            lastUsedOn:
              used
                .map(([k]) => k.slice(k.indexOf('|') + 1))
                .sort()
                .at(-1) ?? null,
          };
        })
        .sort(
          (a, b) =>
            b.habitUseCount - a.habitUseCount ||
            b.useCount - a.useCount ||
            a.name.localeCompare(b.name),
        );
    },

    /** Get-or-create ignoring case. */
    create(raw: string): TagSummary {
      const name = cleanName(raw);
      const existing = tags.find((tag) => sameName(tag.name, name));
      if (existing) return { id: existing.id, name: existing.name };
      if (tags.length >= MAX_PER_USER) {
        throw apiError(400, { detail: `You can have at most ${MAX_PER_USER} tags.` });
      }
      const tag = { id: `tag-new-${++made}`, name };
      tags.push(tag);
      return { ...tag };
    },

    rename(id: string, raw: string) {
      const tag = find(id);
      if (!tag) throw apiError(404);
      const name = cleanName(raw);
      const other = tags.find((candidate) => candidate.id !== id && sameName(candidate.name, name));
      if (!other) {
        tag.name = name;
        return { id, name, merged: false };
      }
      // Merge: every day of the renamed tag goes to the other one, the renamed tag is gone.
      for (const ids of days.values()) {
        if (ids.delete(id)) ids.add(other.id);
      }
      tags.splice(tags.indexOf(tag), 1);
      return { id: other.id, name: other.name, merged: true };
    },

    remove(id: string) {
      const tag = find(id);
      if (!tag) throw apiError(404);
      let removedFromDays = 0;
      for (const [k, ids] of days) {
        if (ids.delete(id)) removedFromDays++;
        if (ids.size === 0) days.delete(k);
      }
      tags.splice(tags.indexOf(tag), 1);
      return { removedFromDays };
    },

    /** Everything a habit's days carry goes with the habit. */
    forgetHabit(habitId: string) {
      for (const k of [...days.keys()]) if (k.startsWith(`${habitId}|`)) days.delete(k);
    },
  };

  return book;
}

export type TagBook = ReturnType<typeof createTagBook>;
