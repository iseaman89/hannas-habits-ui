/** What the person is told: everything is on the server / a write is waiting or on its way / the last write failed. */
export type SaveStatus = 'saved' | 'saving' | 'error';

interface AutosaverOptions<T> {
  /** Writes the whole value. Rejects when it could not. */
  save: (value: T) => Promise<void>;
  /** How long the value must stay untouched before it is written. */
  delayMs: number;
  /** Called when a write failed and nothing newer replaces it. */
  onFailure?: (error: unknown) => void;
}

export interface Autosaver<T> {
  /** The value changed; it is written after a pause of `delayMs`. Only the newest value is ever written. */
  change: (value: T) => void;
  /** Writes what is waiting now. Also the "retry" after a failure. Resolves when nothing is left to do; never rejects. */
  flush: () => Promise<void>;
  getStatus: () => SaveStatus;
  /** For `useSyncExternalStore`. */
  subscribe: (listener: () => void) => () => void;
}

/**
 * Saves a document the person keeps editing, without a save button:
 *
 * - **Debounced.** A write follows a pause of `delayMs`, not every keystroke.
 * - **One request at a time.** While a write is on its way, further changes only replace the
 *   value that waits; when the request is done, one more write carries the newest value. Two
 *   writes of one document in flight could land in either order and leave the old one on top.
 * - **Whole value.** Every write carries the full document, so a write that failed is made
 *   good by any later one, and the server needs no merging.
 * - **A failure keeps the value.** It stays queued, the status says `error`, and `flush()` (the
 *   retry button) or the next change sends it again. Nothing is retried by itself: a rejected
 *   write (say, a validation error) would only be rejected again.
 *
 * Plain TypeScript, no React: it is tested with fake timers and put into React by
 * `useSyncExternalStore` (`getStatus` / `subscribe`).
 */
export function createAutosaver<T>({
  save,
  delayMs,
  onFailure,
}: AutosaverOptions<T>): Autosaver<T> {
  let status: SaveStatus = 'saved';
  /** Boxed, so a value that is falsy itself still counts as "something is waiting". */
  let waiting: { value: T } | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  /** True exactly while `run` is going through its loop, so a second `drain` joins it instead of starting another. */
  let active = false;
  let current: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();

  function setStatus(next: SaveStatus): void {
    if (status === next) return;
    status = next;
    listeners.forEach((listener) => listener());
  }

  async function run(): Promise<void> {
    active = true;
    try {
      while (waiting) {
        const { value } = waiting;
        waiting = undefined;
        setStatus('saving');

        try {
          await save(value);
        } catch (error) {
          if (!waiting) {
            waiting = { value };
            setStatus('error');
            onFailure?.(error);
            return;
          }
          // A newer value came in meanwhile. It is the whole document, so it makes the failed
          // write good - it goes out next, and if that fails too, that failure is reported.
        }

        // Changes made during the request wait for their own pause - unless that pause is over
        // already (its timer fired while the request was still on its way): then they go now.
        if (waiting && timer !== undefined) return;
      }
      setStatus('saved');
    } finally {
      active = false;
    }
  }

  function drain(): Promise<void> {
    if (!active) current = run();
    return current;
  }

  return {
    change(value) {
      waiting = { value };
      setStatus('saving');
      clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        void drain();
      }, delayMs);
    },

    flush() {
      clearTimeout(timer);
      timer = undefined;
      return drain();
    },

    getStatus: () => status,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
