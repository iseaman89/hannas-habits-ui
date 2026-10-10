import type { TagsGateway } from '@/features/tags/tagsGateway';
import type { TagBook } from './tagBook';

type Call = keyof TagsGateway;

/**
 * An in-memory stand-in for the tags API on top of a `TagBook` (share the book with `fakeHabits`
 * so a tag on a day shows in the overview). Same helpers as `fakeHabits`: every call is written
 * down, `hold()` makes calls wait, `failNext()` makes the next one of a kind fail once.
 */
export function fakeTags(book: TagBook) {
  const calls = {
    /** The `habitId` of every list call (`undefined` = the whole list). */
    list: [] as (string | undefined)[],
    create: [] as string[],
    rename: [] as { id: string; name: string }[],
    remove: [] as string[],
  };

  let gate: Promise<void> = Promise.resolve();
  const failures = new Map<Call, unknown[]>();

  async function enter(call: Call): Promise<void> {
    await gate;
    const queued = failures.get(call);
    if (queued?.length) throw queued.shift();
  }

  const gateway: TagsGateway = {
    list: async (habitId) => {
      calls.list.push(habitId);
      await enter('list');
      return book.list(habitId);
    },
    create: async (name) => {
      calls.create.push(name);
      await enter('create');
      return book.create(name);
    },
    rename: async (id, name) => {
      calls.rename.push({ id, name });
      await enter('rename');
      return book.rename(id, name);
    },
    remove: async (id) => {
      calls.remove.push(id);
      await enter('remove');
      return book.remove(id);
    },
  };

  return {
    gateway,
    calls,

    hold(): () => void {
      let release!: () => void;
      gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      return release;
    },

    failNext(call: Call, error: unknown): void {
      failures.set(call, [...(failures.get(call) ?? []), error]);
    },
  };
}
