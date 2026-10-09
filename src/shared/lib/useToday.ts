import { useMemo, useSyncExternalStore } from 'react';
import { addDays, startOfDay } from 'date-fns';
import { parseApiDate, toApiDate } from './dates';

/** A little after the stroke of midnight, so the clock has certainly crossed it. */
const MIDNIGHT_SLACK_MS = 500;

/**
 * Tells React to look at the date again - `useSyncExternalStore` renders only if the answer
 * differs from the last one, so asking too often costs nothing. Two triggers: a timer for the
 * next midnight, and the tab coming back to the front - a browser slows or freezes the timers
 * of a tab nobody looks at, and a laptop that slept over midnight never ran the timer at all.
 */
function subscribe(onChange: () => void): () => void {
  let timer: number | undefined;

  function check() {
    window.clearTimeout(timer);
    onChange();
    // `addDays` on the start of the day, not +24 h: a day with a clock change is 23 or 25 hours.
    const now = new Date();
    const untilMidnight = addDays(startOfDay(now), 1).getTime() - now.getTime();
    timer = window.setTimeout(check, untilMidnight + MIDNIGHT_SLACK_MS);
  }

  check();
  document.addEventListener('visibilitychange', check);
  window.addEventListener('focus', check);

  return () => {
    window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', check);
    window.removeEventListener('focus', check);
  };
}

/**
 * The client's local today (as local midnight), for a screen that stays open. Reading
 * `new Date()` while rendering gives the day the screen last happened to render on: a tab left
 * open over midnight would go on showing yesterday as "today" (the highlighted day, the days
 * left in the year, the streak's `asOf`) until something else made it render. This hook renders
 * the screen again when the day changes.
 *
 * Only for what *describes* the present. A date the person acts on (the day a new habit starts,
 * the diary day in the address) is read when they act, or comes from the address.
 */
export function useToday(): Date {
  const iso = useSyncExternalStore(subscribe, () => toApiDate(new Date()));
  return useMemo(() => parseApiDate(iso) ?? new Date(), [iso]);
}
