import type { RefreshTokenStore } from './session';

export const REFRESH_TOKEN_KEY = 'hh-refresh-token';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Keeps the refresh token across page loads (and shares it between tabs). The access token is
 * not stored at all: it lives in memory and one refresh after a reload brings a new one.
 *
 * Trade-off, stated plainly: anything in `localStorage` can be read by a script that runs on the
 * page (XSS). The alternative is an HttpOnly cookie, which needs backend changes and CSRF
 * handling; for this app the usual SPA compromise is taken (short-lived access token in memory,
 * a refresh token that rotates on every use and whose theft is detected by the backend).
 *
 * When the browser blocks storage (private mode, cookies off) the token is kept in memory
 * instead: signing in still works, it just does not survive a reload.
 */
export function createRefreshTokenStore(
  storage: StorageLike = window.localStorage,
  events: Pick<Window, 'addEventListener' | 'removeEventListener'> = window,
): RefreshTokenStore {
  let inMemory: string | null = null;

  return {
    read() {
      try {
        // Always from storage, never from `inMemory`: another tab may have rotated or removed it.
        return storage.getItem(REFRESH_TOKEN_KEY);
      } catch {
        return inMemory;
      }
    },
    write(token) {
      inMemory = token;
      try {
        storage.setItem(REFRESH_TOKEN_KEY, token);
      } catch {
        // storage blocked: the in-memory copy is all there is
      }
    },
    clear() {
      inMemory = null;
      try {
        storage.removeItem(REFRESH_TOKEN_KEY);
      } catch {
        // storage blocked: nothing stored, nothing to remove
      }
    },
    onRemovedElsewhere(listener) {
      // The browser fires `storage` in the *other* tabs only, so this tab's own clear() does not
      // call back. `key === null` is `localStorage.clear()`.
      function handle(event: StorageEvent) {
        if (event.storageArea !== storage) return;
        const removed = event.key === null || (event.key === REFRESH_TOKEN_KEY && !event.newValue);
        if (removed) listener();
      }
      events.addEventListener('storage', handle);
      return () => events.removeEventListener('storage', handle);
    },
  };
}
