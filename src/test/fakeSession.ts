import type { Session, SessionState, SessionUser } from '@/features/auth/session';

export const testUser: SessionUser = {
  id: 'u-1',
  userName: 'hanna@example.com',
  email: 'hanna@example.com',
  firstName: 'Hanna',
  lastName: null,
};

export const signedIn: SessionState = { status: 'authenticated', user: testUser, endedBy: null };
export const signedOut: SessionState = { status: 'anonymous', user: null, endedBy: null };
export const restoring: SessionState = { status: 'restoring', user: null, endedBy: null };
export const unreachable: SessionState = { status: 'unreachable', user: null, endedBy: null };

/**
 * A session the test steers by hand: `set` changes the state and tells the listeners, like the
 * real one does; the calls the UI makes are counted.
 */
export function fakeSession(initial: SessionState = signedOut) {
  let state = initial;
  const listeners = new Set<() => void>();
  let restoreGate: Promise<void> | null = null;

  const fake = {
    restoreCalls: 0,
    endCalls: 0,
    started: [] as unknown[],

    set(next: SessionState) {
      state = next;
      listeners.forEach((notify) => notify());
    },

    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start(result: unknown) {
      fake.started.push(result);
    },
    restore() {
      fake.restoreCalls++;
      return restoreGate ?? Promise.resolve();
    },
    /** Makes `restore()` answer only after the returned `release()`. */
    holdRestore() {
      let release!: () => void;
      restoreGate = new Promise<void>((resolve) => (release = resolve));
      return release;
    },
    end() {
      fake.endCalls++;
      return Promise.resolve();
    },
    getAccessToken: () => null,
    renew: () => Promise.reject(new Error('not used in this test')),
  } satisfies Session & Record<string, unknown>;

  return fake;
}
