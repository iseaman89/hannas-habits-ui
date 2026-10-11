import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/shared/lib/cn';

/** How long the pointer rests on the trigger before the card opens: sweeping over a grid must not light up every cell it crosses. */
const OPEN_DELAY_MS = 250;
/** How long the pointer may be off the trigger *and* the card before the card closes (the gap between the two). */
const CLOSE_DELAY_MS = 150;
/** Space between the trigger and the card, and the card's smallest distance to the window's edge. */
const GAP = 6;
const MARGIN = 8;

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface HoverCardProps {
  /** Names the card for a screen reader (it is a group). */
  label: string;
  /** What the card says. Without one (`null`) the trigger is simply its children. */
  card: ReactNode;
  /** The trigger: hovering or focusing anything inside opens the card. */
  children: ReactNode;
  className?: string;
}

/**
 * A small card beside whatever is hovered (or reached by keyboard): the day cells of the habit
 * grid use it to show and write notes. It is the app's own surface (`bg-surface`, the shadow of a
 * dialog), not a browser tooltip, because it may hold a field.
 *
 * - **Hover intent.** The card opens after a short rest of the mouse and closes a moment after the
 *   mouse left both the trigger and the card, so the pointer can cross the gap and move into it.
 *   A touch has no hover: it never opens the card (the controls inside stay the way to act).
 * - **Keyboard.** Focusing the trigger opens it (a mouse press focuses a button too, but the mouse
 *   has opened the card already); the card follows the trigger in the tab order, so Tab walks into
 *   a field in it. Escape closes it and gives the focus back to the trigger.
 * - **Stays while used.** A field with the focus keeps the card open wherever the mouse is; the
 *   card closes when the focus leaves it.
 * - **Position.** `fixed`, so the grid's scrolling box does not clip it, below the trigger (above
 *   when there is no room) and kept inside the window. It closes when anything scrolls or the
 *   window is resized, since a fixed card would no longer be beside its trigger.
 *
 * The card is rendered right after the trigger (not in a portal) so that the DOM order is the
 * reading and tab order.
 */
export function HoverCard({ label, card, children, className }: HoverCardProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const root = useRef<HTMLSpanElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const openTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);
  const hovering = useRef(false);
  const focusInPanel = useRef(false);
  const skipNextFocus = useRef(false);
  /** A mouse button is down: the focus that follows is a click's, not a request for the card. */
  const pressed = useRef(false);

  const hasCard = card !== null && card !== undefined && card !== false;
  const shown = open && hasCard;

  useEffect(
    () => () => {
      window.clearTimeout(openTimer.current);
      window.clearTimeout(closeTimer.current);
    },
    [],
  );

  const scheduleClose = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      if (!hovering.current && !focusInPanel.current) setOpen(false);
    }, CLOSE_DELAY_MS);
  }, []);

  useLayoutEffect(() => {
    const anchor = root.current;
    const box = panel.current;
    if (!shown || !anchor || !box) {
      setPosition(null);
      return;
    }

    const trigger = anchor.getBoundingClientRect();
    const size = box.getBoundingClientRect();
    const left = trigger.left + trigger.width / 2 - size.width / 2;
    const below = trigger.bottom + GAP;
    const above = trigger.top - GAP - size.height;
    const fitsBelow = below + size.height <= window.innerHeight - MARGIN;

    setPosition({
      left: Math.max(MARGIN, Math.min(left, window.innerWidth - size.width - MARGIN)),
      top: fitsBelow || above < MARGIN ? below : above,
    });
  }, [shown]);

  useEffect(() => {
    if (!shown) return;
    const closeOnScroll = (event: Event) => {
      // Scrolling inside the card (a long note in its field) is not the trigger moving away.
      if (event.target instanceof Node && panel.current?.contains(event.target)) return;
      setOpen(false);
    };
    const closeNow = () => setOpen(false);

    window.addEventListener('scroll', closeOnScroll, true);
    window.addEventListener('resize', closeNow);
    return () => {
      window.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', closeNow);
    };
  }, [shown]);

  function onPointerEnter(event: PointerEvent) {
    if (!hasCard || event.pointerType === 'touch') return;
    hovering.current = true;
    window.clearTimeout(closeTimer.current);
    if (open) return;
    window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => setOpen(true), OPEN_DELAY_MS);
  }

  function onPointerLeave(event: PointerEvent) {
    if (event.pointerType === 'touch') return;
    hovering.current = false;
    window.clearTimeout(openTimer.current);
    scheduleClose();
  }

  function onFocus(event: FocusEvent) {
    if (!hasCard) return;
    const target = event.target as HTMLElement;
    focusInPanel.current = panel.current?.contains(target) === true;

    if (focusInPanel.current) {
      window.clearTimeout(closeTimer.current);
      return;
    }
    if (skipNextFocus.current || pressed.current) return;
    setOpen(true);
  }

  function onBlur(event: FocusEvent) {
    const next = event.relatedTarget;
    // Moving between the trigger and the card: onFocus has the news.
    if (next instanceof Node && root.current?.contains(next)) return;
    focusInPanel.current = false;
    scheduleClose();
  }

  function onPointerDown() {
    pressed.current = true;
  }

  function onPointerUp() {
    pressed.current = false;
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !shown) return;

    if (panel.current?.contains(document.activeElement)) {
      // The focus would be lost with the field: back to the trigger, which must not reopen the card.
      const trigger = Array.from(root.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).find(
        (element) => !panel.current?.contains(element),
      );
      skipNextFocus.current = true;
      trigger?.focus();
      skipNextFocus.current = false;
    }
    focusInPanel.current = false;
    setOpen(false);
  }

  return (
    // The handlers only watch what happens to the controls inside; the span itself is not one.
    <span
      ref={root}
      className={cn('inline-flex flex-col items-center', className)}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    >
      {children}
      {shown && (
        <div
          ref={panel}
          role="group"
          aria-label={label}
          style={{
            position: 'fixed',
            left: position?.left ?? 0,
            top: position?.top ?? 0,
            visibility: position ? 'visible' : 'hidden',
          }}
          // Above the grid's sticky names (z-10) and the pinned header (z-20), under the toasts (z-50).
          className="z-30 w-72 max-w-[calc(100vw-1rem)] cursor-auto whitespace-normal rounded-md bg-surface p-3 text-left text-base font-normal text-text shadow-lg ring-1 ring-divider"
        >
          {card}
        </div>
      )}
    </span>
  );
}
