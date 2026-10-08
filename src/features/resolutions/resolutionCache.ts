import type { QueryClient } from '@tanstack/react-query';
import { resolutionKeys } from './resolutionQueries';
import type { Resolution } from './resolutionsGateway';

/** The list with one item's `kept` changed. Order and every other item stay as they are. */
export function withKept(list: readonly Resolution[], id: string, kept: boolean): Resolution[] {
  return list.map((item) => (item.id === id ? { ...item, kept } : item));
}

/** Writes a new `kept` into the loaded list of a year - a year that was not loaded is left alone. */
export function applyKept(queryClient: QueryClient, year: number, id: string, kept: boolean): void {
  queryClient.setQueryData<Resolution[]>(resolutionKeys.year(year), (list) =>
    list ? withKept(list, id, kept) : undefined,
  );
}
