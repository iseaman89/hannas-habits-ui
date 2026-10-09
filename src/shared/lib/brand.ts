import { possessive } from './possessive';

export const BRAND_NAME_KEY = 'hh-brand-name';

/** Whose habits the service names until somebody has signed in on this browser. */
export const DEFAULT_BRAND_NAME = 'Hanna';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/** What the store needs of `window`: to hear that another tab wrote to storage. */
interface StorageEvents {
  addEventListener(type: 'storage', listener: (event: StorageEvent) => void): void;
  removeEventListener(type: 'storage', listener: (event: StorageEvent) => void): void;
}

/** "Hanna's Habits", "Hans' Habits": the name of the service for a first name. */
export function brandTitle(firstName: string): string {
  return `${possessive(firstName)} Habits`;
}

export interface BrandStore {
  /** The first name the service carries on this browser. */
  name(): string;
  /** Keeps the first name of somebody who has signed in; blank is ignored. */
  remember(firstName: string): void;
  /** For `useSyncExternalStore`; also fires when another tab remembers a name. */
  subscribe(listener: () => void): () => void;
}

function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null; // some browsers throw even for looking at it (cookies off)
  }
}

/**
 * Remembers which first name the service is named after, so that "Hanna's Habits" turns into
 * "Yevgen's Habits" once Yevgen has signed in - and stays so on the login page after a log-out.
 *
 * What is stored: that one first name, in this browser, under one key. It is never sent anywhere
 * (the server gets the name from the account, not from here) and not secret - but it does stay
 * after a log-out, on purpose, so whoever uses this browser next sees it. Clearing the site's data
 * brings back the default. When the browser blocks storage the name is kept in memory: it then
 * lasts until the page is reloaded.
 */
export function createBrandStore(
  storage: StorageLike | null = browserStorage(),
  events: StorageEvents = window,
): BrandStore {
  let inMemory: string | null = null;
  const listeners = new Set<() => void>();

  function stored(): string | null {
    if (!storage) return inMemory;
    try {
      // Always from storage, never from `inMemory`: another tab may have changed it.
      return storage.getItem(BRAND_NAME_KEY)?.trim() || null;
    } catch {
      return inMemory;
    }
  }

  return {
    name: () => stored() ?? DEFAULT_BRAND_NAME,

    remember(firstName) {
      const name = firstName.trim();
      if (!name || name === stored()) return;

      inMemory = name;
      try {
        storage?.setItem(BRAND_NAME_KEY, name);
      } catch {
        // storage blocked: the in-memory copy is all there is
      }
      listeners.forEach((listener) => listener());
    },

    subscribe(listener) {
      listeners.add(listener);
      // The browser fires `storage` in the *other* tabs only; this tab's own remember() calls back above.
      function handle(event: StorageEvent) {
        if (event.storageArea === storage && (event.key === null || event.key === BRAND_NAME_KEY)) {
          listener();
        }
      }
      events.addEventListener('storage', handle);
      return () => {
        listeners.delete(listener);
        events.removeEventListener('storage', handle);
      };
    },
  };
}

/** The store of the running app. */
export const brand = createBrandStore();
