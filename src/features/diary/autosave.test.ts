import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAutosaver, type SaveStatus } from './autosave';

const DELAY = 800;

/** A `save` the test steers: each call waits until the test settles it. */
function controlledSave() {
  const written: string[] = [];
  const pending: { resolve: () => void; reject: (error: Error) => void }[] = [];
  let running = 0;
  let mostAtOnce = 0;

  const save = (value: string) => {
    written.push(value);
    running++;
    mostAtOnce = Math.max(mostAtOnce, running);
    return new Promise<void>((resolve, reject) => {
      pending.push({
        resolve: () => {
          running--;
          resolve();
        },
        reject: (error) => {
          running--;
          reject(error);
        },
      });
    });
  };

  return {
    save,
    written,
    mostAtOnce: () => mostAtOnce,
    /** Lets the oldest unanswered write succeed / fail, and runs what follows from that. */
    async succeed() {
      pending.shift()?.resolve();
      await vi.advanceTimersByTimeAsync(0);
    },
    async fail(error: Error = new Error('boom')) {
      pending.shift()?.reject(error);
      await vi.advanceTimersByTimeAsync(0);
    },
  };
}

/** A `save` that works at once. */
const instantly = () => {
  const written: string[] = [];
  return {
    written,
    save: (value: string) => {
      written.push(value);
      return Promise.resolve();
    },
  };
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('when it writes', () => {
  it('writes after a pause, not before', async () => {
    const { save, written } = instantly();
    const saver = createAutosaver({ save, delayMs: DELAY });

    saver.change('a');
    await vi.advanceTimersByTimeAsync(DELAY - 1);
    expect(written).toEqual([]);

    await vi.advanceTimersByTimeAsync(1);
    expect(written).toEqual(['a']);
  });

  it('starts the pause over with every change and writes only the newest value', async () => {
    const { save, written } = instantly();
    const saver = createAutosaver({ save, delayMs: DELAY });

    saver.change('a');
    await vi.advanceTimersByTimeAsync(DELAY - 100);
    saver.change('ab');
    await vi.advanceTimersByTimeAsync(DELAY - 100);
    saver.change('abc');
    await vi.advanceTimersByTimeAsync(DELAY - 1);
    expect(written).toEqual([]);

    await vi.advanceTimersByTimeAsync(1);
    expect(written).toEqual(['abc']);
  });

  it('writes a value that is falsy itself (0, empty text)', async () => {
    const { save, written } = instantly();
    const saver = createAutosaver({ save, delayMs: DELAY });

    saver.change('');
    await vi.advanceTimersByTimeAsync(DELAY);

    expect(written).toEqual(['']);
  });

  it('flush writes what is waiting now and the timer then has nothing left to do', async () => {
    const { save, written } = instantly();
    const saver = createAutosaver({ save, delayMs: DELAY });

    saver.change('a');
    await saver.flush();
    expect(written).toEqual(['a']);

    await vi.advanceTimersByTimeAsync(DELAY * 2);
    expect(written).toEqual(['a']);
  });

  it('flush with nothing waiting writes nothing', async () => {
    const { save, written } = instantly();
    const saver = createAutosaver({ save, delayMs: DELAY });

    await saver.flush();

    expect(written).toEqual([]);
    expect(saver.getStatus()).toBe('saved');
  });
});

describe('one request at a time', () => {
  it('holds back changes made while a write is on its way and sends one more with the newest', async () => {
    const control = controlledSave();
    const saver = createAutosaver({ save: control.save, delayMs: DELAY });

    saver.change('a');
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(control.written).toEqual(['a']);

    saver.change('ab');
    saver.change('abc');
    await vi.advanceTimersByTimeAsync(DELAY * 3); // their pause is over, but 'a' is still going
    expect(control.written).toEqual(['a']);

    await control.succeed();
    expect(control.written).toEqual(['a', 'abc']);
    expect(control.mostAtOnce()).toBe(1);

    await control.succeed();
    expect(saver.getStatus()).toBe('saved');
  });

  it('lets changes made during a write wait for their own pause when it is not over yet', async () => {
    const control = controlledSave();
    const saver = createAutosaver({ save: control.save, delayMs: DELAY });

    saver.change('a');
    await vi.advanceTimersByTimeAsync(DELAY);
    saver.change('ab'); // pause starts now
    await vi.advanceTimersByTimeAsync(100);

    await control.succeed(); // 'a' is done, but 'ab' has waited only 100 ms
    expect(control.written).toEqual(['a']);
    expect(saver.getStatus()).toBe('saving');

    await vi.advanceTimersByTimeAsync(DELAY - 100);
    expect(control.written).toEqual(['a', 'ab']);
  });

  it('flush during a write waits for it and for the follow-up, and never runs a second request alongside', async () => {
    const control = controlledSave();
    const saver = createAutosaver({ save: control.save, delayMs: DELAY });

    saver.change('a');
    await vi.advanceTimersByTimeAsync(DELAY);
    saver.change('ab');
    let flushed = false;
    void saver.flush().then(() => (flushed = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(control.written).toEqual(['a']);

    await control.succeed();
    expect(control.written).toEqual(['a', 'ab']);
    expect(flushed).toBe(false);

    await control.succeed();
    expect(flushed).toBe(true);
    expect(control.mostAtOnce()).toBe(1);
  });
});

describe('the status', () => {
  it('goes from saved to saving at the first change and back to saved when the write is done', async () => {
    const control = controlledSave();
    const saver = createAutosaver({ save: control.save, delayMs: DELAY });
    const seen: SaveStatus[] = [];
    saver.subscribe(() => seen.push(saver.getStatus()));

    expect(saver.getStatus()).toBe('saved');
    saver.change('a');
    expect(saver.getStatus()).toBe('saving');
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(saver.getStatus()).toBe('saving');
    await control.succeed();

    expect(saver.getStatus()).toBe('saved');
    expect(seen).toEqual(['saving', 'saved']);
  });

  it('stops telling a listener that unsubscribed', () => {
    const { save } = instantly();
    const saver = createAutosaver({ save, delayMs: DELAY });
    const seen: SaveStatus[] = [];
    const unsubscribe = saver.subscribe(() => seen.push(saver.getStatus()));

    unsubscribe();
    saver.change('a');

    expect(seen).toEqual([]);
  });
});

describe('when a write fails', () => {
  it('says so once, keeps the value and goes to error', async () => {
    const control = controlledSave();
    const failures: unknown[] = [];
    const saver = createAutosaver({
      save: control.save,
      delayMs: DELAY,
      onFailure: (error) => failures.push(error),
    });
    const boom = new Error('offline');

    saver.change('a');
    await vi.advanceTimersByTimeAsync(DELAY);
    await control.fail(boom);

    expect(saver.getStatus()).toBe('error');
    expect(failures).toEqual([boom]);
    // Nothing is retried by itself.
    await vi.advanceTimersByTimeAsync(DELAY * 10);
    expect(control.written).toEqual(['a']);
  });

  it('flush is the retry: it sends the same value again', async () => {
    const control = controlledSave();
    const saver = createAutosaver({ save: control.save, delayMs: DELAY });

    saver.change('a');
    await vi.advanceTimersByTimeAsync(DELAY);
    await control.fail();

    void saver.flush();
    await vi.advanceTimersByTimeAsync(0);
    expect(saver.getStatus()).toBe('saving');
    await control.succeed();

    expect(control.written).toEqual(['a', 'a']);
    expect(saver.getStatus()).toBe('saved');
  });

  it('sends the next change after a failure, whole, without a retry button', async () => {
    const control = controlledSave();
    const saver = createAutosaver({ save: control.save, delayMs: DELAY });

    saver.change('a');
    await vi.advanceTimersByTimeAsync(DELAY);
    await control.fail();

    saver.change('ab');
    expect(saver.getStatus()).toBe('saving');
    await vi.advanceTimersByTimeAsync(DELAY);
    await control.succeed();

    expect(control.written).toEqual(['a', 'ab']);
    expect(saver.getStatus()).toBe('saved');
  });

  it('does not report a failure that a newer change already replaced, and sends the newer one', async () => {
    const control = controlledSave();
    const failures: unknown[] = [];
    const saver = createAutosaver({
      save: control.save,
      delayMs: DELAY,
      onFailure: (error) => failures.push(error),
    });

    saver.change('a');
    await vi.advanceTimersByTimeAsync(DELAY);
    saver.change('ab'); // while 'a' is on its way
    await vi.advanceTimersByTimeAsync(DELAY); // its pause is over
    await control.fail();

    expect(failures).toEqual([]);
    expect(control.written).toEqual(['a', 'ab']);
    await control.succeed();
    expect(saver.getStatus()).toBe('saved');
  });

  it('reports the failure of that newer write if it fails as well', async () => {
    const control = controlledSave();
    const failures: unknown[] = [];
    const saver = createAutosaver({
      save: control.save,
      delayMs: DELAY,
      onFailure: (error) => failures.push(error),
    });

    saver.change('a');
    await vi.advanceTimersByTimeAsync(DELAY);
    saver.change('ab');
    await vi.advanceTimersByTimeAsync(DELAY);
    await control.fail(new Error('first'));
    await control.fail(new Error('second'));

    expect(failures).toHaveLength(1);
    expect(saver.getStatus()).toBe('error');
    void saver.flush();
    await vi.advanceTimersByTimeAsync(0);
    expect(control.written).toEqual(['a', 'ab', 'ab']);
  });
});
