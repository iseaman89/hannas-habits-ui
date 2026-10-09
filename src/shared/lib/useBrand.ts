import { useSyncExternalStore } from 'react';
import { brand } from './brand';

const subscribe = (listener: () => void) => brand.subscribe(listener);
const snapshot = () => brand.name();

/** The first name the service is named after on this browser (see `brand.ts`). */
export function useBrandName(): string {
  return useSyncExternalStore(subscribe, snapshot);
}
