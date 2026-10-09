// Google draws the button in an iframe and takes its width in pixels, between 200 and 400.
const MIN_BUTTON_WIDTH = 200;
const MAX_BUTTON_WIDTH = 400;
const DEFAULT_BUTTON_WIDTH = 320;

/** As wide as the space it sits in (like the form's own button), within what Google allows. */
export function googleButtonWidth(available: number | null): number {
  if (available === null) return DEFAULT_BUTTON_WIDTH;
  return Math.min(MAX_BUTTON_WIDTH, Math.max(MIN_BUTTON_WIDTH, available));
}
