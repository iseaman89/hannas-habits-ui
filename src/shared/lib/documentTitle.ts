import { useEffect } from 'react';
import { brand, brandTitle } from './brand';
import { useBrandName } from './useBrand';

/**
 * The text of the browser tab: "<title> · Hanna's Habits", or just the name of the service
 * without a title. The service is named after the person (see `brand.ts`).
 */
export function documentTitle(title: string | null, firstName: string = brand.name()): string {
  const app = brandTitle(firstName);
  return title ? `${title} · ${app}` : app;
}

/**
 * Keeps the tab's title in step with the screen. In a single-page app nothing else does: the
 * page never reloads, so the tab (and a screen reader, which announces a changed title) would
 * still say the name of the first screen. Leaving the screen puts the plain name back.
 */
export function useDocumentTitle(title: string | null): void {
  const firstName = useBrandName();

  useEffect(() => {
    document.title = documentTitle(title, firstName);
    return () => {
      document.title = documentTitle(null, firstName);
    };
  }, [title, firstName]);
}
