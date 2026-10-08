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
