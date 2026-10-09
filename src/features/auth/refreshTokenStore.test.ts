import { describe, expect, it } from 'vitest';
import { REFRESH_TOKEN_KEY, createRefreshTokenStore } from './refreshTokenStore';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

/** What a browser with blocked storage does: every access throws. */
const blockedStorage = {
  getItem: (): string | null => {
    throw new DOMException('blocked', 'SecurityError');
  },
  setItem: (): void => {
    throw new DOMException('blocked', 'SecurityError');
  },
  removeItem: (): void => {
    throw new DOMException('blocked', 'SecurityError');
  },
};

describe('refresh token store', () => {
  it('keeps the token in storage under one key', () => {
    const storage = memoryStorage();
    const store = createRefreshTokenStore(storage);

    expect(store.read()).toBeNull();
    store.write('r1');

    expect(storage.data.get(REFRESH_TOKEN_KEY)).toBe('r1');
    expect(store.read()).toBe('r1');

    store.clear();
    expect(store.read()).toBeNull();
    expect(storage.data.size).toBe(0);
  });

  it('reads what another tab wrote, not its own last write', () => {
    const storage = memoryStorage();
    const thisTab = createRefreshTokenStore(storage);
    const otherTab = createRefreshTokenStore(storage);

    thisTab.write('r1');
    otherTab.write('r2'); // the other tab refreshed

    expect(thisTab.read()).toBe('r2');
  });

  it('sees that another tab logged out', () => {
    const storage = memoryStorage();
    const thisTab = createRefreshTokenStore(storage);
    const otherTab = createRefreshTokenStore(storage);
    thisTab.write('r1');

    otherTab.clear();

    expect(thisTab.read()).toBeNull();
  });

  it('falls back to memory when the browser blocks storage', () => {
    const store = createRefreshTokenStore(blockedStorage);

    expect(store.read()).toBeNull();
    store.write('r1');
    expect(store.read()).toBe('r1'); // survives the page's lifetime, not a reload

    store.clear();
    expect(store.read()).toBeNull();
  });
});

describe('a token removed in another tab', () => {
  // jsdom has a real localStorage, so the event can carry a real `storageArea`; the store is
  // given a window-like object of its own to listen on, so nothing leaks between tests.
  function setup() {
    const area = window.localStorage;
    const target = new EventTarget();
    const store = createRefreshTokenStore(area, target);
    const told: string[] = [];
    const stop = store.onRemovedElsewhere?.(() => told.push('removed'));
    const fire = (init: StorageEventInit) =>
      target.dispatchEvent(new StorageEvent('storage', { storageArea: area, ...init }));
    return { store, told, stop, fire };
  }

  it('tells the listener when another tab removes the token', () => {
    const { told, fire } = setup();

    fire({ key: REFRESH_TOKEN_KEY, oldValue: 'r1', newValue: null });

    expect(told).toEqual(['removed']);
  });

  it('tells it when another tab clears the whole storage', () => {
    const { told, fire } = setup();

    fire({ key: null });

    expect(told).toEqual(['removed']);
  });

  it('stays quiet when another tab only replaced the token (a refresh) or touched another key', () => {
    const { told, fire } = setup();

    fire({ key: REFRESH_TOKEN_KEY, oldValue: 'r1', newValue: 'r2' });
    fire({ key: 'hh-theme', oldValue: 'light', newValue: null });

    expect(told).toEqual([]);
  });

  it('ignores another storage area (sessionStorage)', () => {
    const { told, fire } = setup();

    fire({ key: REFRESH_TOKEN_KEY, newValue: null, storageArea: window.sessionStorage });

    expect(told).toEqual([]);
  });

  it('stops listening when asked to', () => {
    const { told, fire, stop } = setup();

    stop?.();
    fire({ key: REFRESH_TOKEN_KEY, newValue: null });

    expect(told).toEqual([]);
  });
});
