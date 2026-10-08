import { describe, expect, it } from 'vitest';
import { singleFlight } from './singleFlight';

/** A promise that is settled by hand, so a test decides when "the network" answers. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('singleFlight', () => {
  it('lets parallel callers share one run and its result', async () => {
    const gate = deferred<string>();
    let runs = 0;
    const refresh = singleFlight(() => {
      runs++;
      return gate.promise;
    });

    const callers = [refresh(), refresh(), refresh()];
    gate.resolve('token');

    expect(await Promise.all(callers)).toEqual(['token', 'token', 'token']);
    expect(runs).toBe(1);
  });

  it('starts a new run once the previous one has settled', async () => {
    let runs = 0;
    const refresh = singleFlight(() => Promise.resolve(++runs));

    expect(await refresh()).toBe(1);
    expect(await refresh()).toBe(2);
  });

  it('hands the same error to every waiting caller, and recovers afterwards', async () => {
    const gate = deferred<string>();
    let runs = 0;
    const refresh = singleFlight(() => {
      runs++;
      return runs === 1 ? gate.promise : Promise.resolve('ok');
    });

    const callers = [refresh(), refresh()];
    const failures = Promise.allSettled(callers);
    gate.reject(new Error('refused'));

    const results = await failures;
    expect(results.map((r) => r.status)).toEqual(['rejected', 'rejected']);
    expect(runs).toBe(1);
    expect(await refresh()).toBe('ok'); // a failed run does not poison the next one
  });
});
