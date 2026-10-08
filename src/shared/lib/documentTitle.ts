import { useEffect } from 'react';

export const APP_NAME = "Hanna's Habits";

/** The text of the browser tab: "<title> · Hanna's Habits", or just the app name without a title. */
export function documentTitle(title: string | null): string {
  return title ? `${title} · ${APP_NAME}` : APP_NAME;
}

/**
 * Keeps the tab's title in step with the screen. In a single-page app nothing else does: the
 * page never reloads, so the tab (and a screen reader, which announces a changed title) would
 * still say the name of the first screen. Leaving the screen puts the plain app name back.
 */
export function useDocumentTitle(title: string | null): void {
  useEffect(() => {
    document.title = documentTitle(title);
    return () => {
      document.title = APP_NAME;
    };
  }, [title]);
}
