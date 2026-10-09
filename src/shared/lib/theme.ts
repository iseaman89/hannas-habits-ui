/**
 * Light/dark switching. The tokens in `shared/ui/theme.css` react to `data-theme` on <html>;
 * this module decides which theme is active and applies it. The React side (one shared
 * context instead of per-component state) comes with the app skeleton in F3.
 */

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'hh-theme';

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

/** The theme the person chose earlier, or `null` (nothing stored, or storage unavailable). */
export function readStoredTheme(storage: Pick<Storage, 'getItem'> = localStorage): Theme | null {
  try {
    const value = storage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null; // storage blocked (private mode, cookies off)
  }
}

export function storeTheme(theme: Theme, storage: Pick<Storage, 'setItem'> = localStorage): void {
  try {
    storage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The choice just is not remembered.
  }
}

/** The operating system's preference. */
export function systemTheme(
  matchMedia: (query: string) => Pick<MediaQueryList, 'matches'> = window.matchMedia.bind(window),
): Theme {
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Stored choice first, then the system preference, light as the last resort. */
export function getInitialTheme(): Theme {
  return readStoredTheme() ?? systemTheme();
}

/** Switches the tokens (`data-theme` on <html>). */
export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = theme;
}
