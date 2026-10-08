import { describe, expect, it } from 'vitest';
import { crossTabExclusive, inPageExclusive } from './exclusive';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('inPageExclusive', () => {
  it('runs tasks one after another, never at the same time', async () => {
    const exclusive = inPageExclusive();
    const log: string[] = [];
    const firstGate = deferred();

    const first = exclusive(async () => {
      log.push('first start');
      await firstGate.promise;
      log.push('first end');
    });
    const second = exclusive(() => {
      log.push('second start');
      return Promise.resolve();
    });

    await Promise.resolve();
    expect(log).toEqual(['first start']); // the second one waits

    firstGate.resolve();
    await Promise.all([first, second]);
    expect(log).toEqual(['first start', 'first end', 'second start']);
  });

  it('returns the result of the task', async () => {
    expect(await inPageExclusive()(() => Promise.resolve(42))).toBe(42);
  });

  it('does not let a failed task block the next one', async () => {
    const exclusive = inPageExclusive();

    await expect(exclusive(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    expect(await exclusive(() => Promise.resolve('fine'))).toBe('fine');
  });
});

describe('crossTabExclusive', () => {
  it('asks the Web Locks API for the named lock and passes the result through', async () => {
    const requested: string[] = [];
    const locks = {
      request: (name: string, callback: () => Promise<unknown>) => {
        requested.push(name);
        return callback();
      },
    } as unknown as Pick<LockManager, 'request'>;

    const exclusive = crossTabExclusive('hh-refresh', locks);

    expect(await exclusive(() => Promise.resolve('done'))).toBe('done');
    expect(requested).toEqual(['hh-refresh']);
  });

  it('falls back to a queue inside the page where the API does not exist', async () => {
    const exclusive = crossTabExclusive('hh-refresh', undefined);
    const log: string[] = [];

    const a = exclusive(async () => {
      await Promise.resolve();
      log.push('a');
    });
    const b = exclusive(() => {
      log.push('b');
      return Promise.resolve();
    });
    await Promise.all([a, b]);

    expect(log).toEqual(['a', 'b']);
  });
});
