/** Runs `task` once nobody else holds the lock, and holds it until the task has settled. */
export type Exclusive = <T>(task: () => Promise<T>) => Promise<T>;

/** A queue inside this page: tasks run one after another, a failed task does not block the next. */
export function inPageExclusive(): Exclusive {
  let tail: Promise<unknown> = Promise.resolve();

  return <T>(task: () => Promise<T>) => {
    const run = tail.then(() => task());
    tail = run.catch(() => undefined);
    return run;
  };
}

/**
 * One lock for all tabs of this browser profile (Web Locks API), so that two tabs never refresh
 * the same refresh token at once: the second use would count as theft and end every session.
 * Where the API does not exist (old browsers, jsdom) it falls back to a queue inside the page.
 */
export function crossTabExclusive(
  name: string,
  locks: Pick<LockManager, 'request'> | undefined = globalThis.navigator?.locks,
): Exclusive {
  if (!locks) return inPageExclusive();

  return <T>(task: () => Promise<T>) => locks.request(name, () => task()) as Promise<T>;
}
