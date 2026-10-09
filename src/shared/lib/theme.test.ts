import { describe, expect, it } from 'vitest';
import {
  THEME_STORAGE_KEY,
  applyTheme,
  isTheme,
  readStoredTheme,
  storeTheme,
  systemTheme,
} from './theme';

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

const throwingStorage = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('isTheme', () => {
  it.each(['light', 'dark'])('accepts %s', (value) => {
    expect(isTheme(value)).toBe(true);
  });

  it.each(['', 'Dark', 'auto', null, undefined, 1])('rejects %s', (value) => {
    expect(isTheme(value)).toBe(false);
  });
});

describe('readStoredTheme', () => {
  it('returns the stored theme', () => {
    expect(readStoredTheme(fakeStorage({ [THEME_STORAGE_KEY]: 'dark' }))).toBe('dark');
  });

  it('returns null when nothing is stored', () => {
    expect(readStoredTheme(fakeStorage())).toBeNull();
  });

  it('ignores a stored value that is not a theme', () => {
    expect(readStoredTheme(fakeStorage({ [THEME_STORAGE_KEY]: 'sepia' }))).toBeNull();
  });

  it('returns null instead of throwing when storage is blocked', () => {
    expect(readStoredTheme(throwingStorage)).toBeNull();
  });
});

describe('storeTheme', () => {
  it('writes under the theme key', () => {
    const storage = fakeStorage();
    storeTheme('dark', storage);
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('does not throw when storage is blocked', () => {
    expect(() => storeTheme('light', throwingStorage)).not.toThrow();
  });
});

describe('systemTheme', () => {
  it('is dark when the system prefers dark', () => {
    expect(systemTheme((query) => ({ matches: query.includes('dark') }))).toBe('dark');
  });

  it('is light otherwise', () => {
    expect(systemTheme(() => ({ matches: false }))).toBe('light');
  });
});

describe('applyTheme', () => {
  it('sets data-theme and nothing else', () => {
    const root = document.createElement('html');

    applyTheme('dark', root);
    expect(root.dataset.theme).toBe('dark');

    applyTheme('light', root);
    expect(root.dataset.theme).toBe('light');
    expect(root.className).toBe('');
  });
});
