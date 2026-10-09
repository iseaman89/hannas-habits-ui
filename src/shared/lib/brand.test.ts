import { describe, expect, it, vi } from 'vitest';
import {
  BRAND_NAME_KEY,
  DEFAULT_BRAND_NAME,
  brandInitial,
  brandTitle,
  createBrandStore,
} from './brand';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  };
}

/** A window that can say "the storage event happened" to whoever listens. */
function fakeWindow() {
  const handlers = new Set<(event: StorageEvent) => void>();
  return {
    addEventListener: (_type: 'storage', handler: (event: StorageEvent) => void) =>
      void handlers.add(handler),
    removeEventListener: (_type: 'storage', handler: (event: StorageEvent) => void) =>
      void handlers.delete(handler),
    emit: (event: Partial<StorageEvent>) =>
      handlers.forEach((handler) => handler(event as StorageEvent)),
    handlers,
  };
}

describe('brandTitle', () => {
  it('names the service after the first name', () => {
    expect(brandTitle('Hanna')).toBe("Hanna's Habits");
    expect(brandTitle('Yevgen')).toBe("Yevgen's Habits");
    expect(brandTitle('Hans')).toBe("Hans' Habits");
  });
});

describe('brandInitial', () => {
  it.each([
    ['Hanna', 'H'],
    ['yevgen', 'Y'],
    ['élodie', 'É'],
    ['  anna', 'A'],
    ['Östen', 'Ö'],
    ['ßa', 'S'], // "ß" would be "SS" in upper case; one letter, always
    ['42 Anna', 'A'],
  ])('%j -> %j', (name, initial) => {
    expect(brandInitial(name)).toBe(initial);
  });

  it.each(['', '   ', '1234', '😀'])('is empty for %j, which has no letter', (name) => {
    expect(brandInitial(name)).toBe('');
  });

  it('is one letter whatever the name: never an "HH" for Hanna’s Habits', () => {
    for (const name of ['Hanna', 'Hans', 'Heidi', 'Hermann', 'Sophie', 'Simon', 'ßtefan']) {
      expect(Array.from(brandInitial(name))).toHaveLength(1);
    }
    expect(brandInitial('Hanna')).toBe('H');
  });
});

describe('the brand store', () => {
  it('names the service after Hanna until somebody has signed in', () => {
    const store = createBrandStore(memoryStorage(), fakeWindow());

    expect(store.name()).toBe(DEFAULT_BRAND_NAME);
    expect(DEFAULT_BRAND_NAME).toBe('Hanna');
  });

  it('remembers a first name, in storage, trimmed', () => {
    const storage = memoryStorage();
    const store = createBrandStore(storage, fakeWindow());

    store.remember('  Yevgen ');

    expect(store.name()).toBe('Yevgen');
    expect(storage.data.get(BRAND_NAME_KEY)).toBe('Yevgen');
  });

  it('reads what an earlier visit stored', () => {
    const store = createBrandStore(memoryStorage({ [BRAND_NAME_KEY]: 'Anna' }), fakeWindow());

    expect(store.name()).toBe('Anna');
  });

  it('keeps a blank name out', () => {
    const storage = memoryStorage({ [BRAND_NAME_KEY]: 'Anna' });
    const store = createBrandStore(storage, fakeWindow());

    store.remember('   ');

    expect(store.name()).toBe('Anna');
  });

  it('tells the listeners about a new name once, and not about the same name again', () => {
    const store = createBrandStore(memoryStorage(), fakeWindow());
    const listener = vi.fn();
    store.subscribe(listener);

    store.remember('Yevgen');
    store.remember('Yevgen');
    store.remember('Anna');

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('stops telling a listener that has left', () => {
    const events = fakeWindow();
    const store = createBrandStore(memoryStorage(), events);
    const listener = vi.fn();
    const leave = store.subscribe(listener);

    leave();
    store.remember('Yevgen');

    expect(listener).not.toHaveBeenCalled();
    expect(events.handlers.size).toBe(0);
  });

  it('hears another tab: the storage event of its key, or of a clear()', () => {
    const storage = memoryStorage();
    const events = fakeWindow();
    const store = createBrandStore(storage, events);
    const listener = vi.fn();
    store.subscribe(listener);

    events.emit({ storageArea: storage as unknown as Storage, key: BRAND_NAME_KEY });
    events.emit({ storageArea: storage as unknown as Storage, key: null });
    events.emit({ storageArea: storage as unknown as Storage, key: 'something-else' });
    events.emit({ storageArea: memoryStorage() as unknown as Storage, key: BRAND_NAME_KEY });

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('keeps the name in memory when the browser blocks storage', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    const store = createBrandStore(blocked, fakeWindow());
    expect(store.name()).toBe(DEFAULT_BRAND_NAME);

    store.remember('Yevgen');

    expect(store.name()).toBe('Yevgen');
  });

  it('works without any storage at all', () => {
    const store = createBrandStore(null, fakeWindow());

    store.remember('Yevgen');

    expect(store.name()).toBe('Yevgen');
  });
});
