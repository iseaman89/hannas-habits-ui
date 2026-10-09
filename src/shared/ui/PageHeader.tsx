import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { useDocumentTitle } from '@/shared/lib/documentTitle';

interface PageHeaderProps {
  /** Small uppercase line above the title, e.g. "Daily diary". */
  kicker: string;
  title: ReactNode;
  /** Sits right after the title, e.g. the "Saved" tag. */
  status?: ReactNode;
  /** Right-aligned buttons. */
  actions?: ReactNode;
  /** More that belongs to the top of the screen, e.g. the calendar's colour legend. */
  below?: ReactNode;
  /**
   * Keeps the header (and `below`) at the top of the screen while the page scrolls under it. For
   * a screen inside `AppShell`, whose `main` has no spacing above it: the header sits at the very
   * top, at rest and while scrolling, so it never moves.
   */
  pinned?: boolean;
  className?: string;
}

/**
 * The heading of a screen. It also names the screen in the browser tab ("<title> · <kicker> ·
 * Hanna's Habits"): every screen has exactly one header, so this is the one place for it.
 *
 * Layout: a phone gets two rows - the kicker with the status at its right, the title with the
 * buttons at its right. The two wrappers dissolve (`contents`) so that all four are cells of the
 * one grid. From `sm` on it is the roomy layout: the title with its status after it, the
 * buttons on the far right.
 */
export function PageHeader({
  kicker,
  title,
  status,
  actions,
  below,
  pinned,
  className,
}: PageHeaderProps) {
  useDocumentTitle(
    typeof title === 'string' || typeof title === 'number' ? `${title} · ${kicker}` : null,
  );

  const header = (
    <header
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1',
        'sm:flex sm:flex-wrap sm:items-end sm:justify-between sm:gap-4',
        className,
      )}
    >
      <div className="contents sm:block">
        <p className="col-start-1 row-start-1 text-kicker font-bold uppercase tracking-[0.1em] text-accent-700">
          {kicker}
        </p>
        <div className="contents sm:flex sm:flex-wrap sm:items-center sm:gap-3">
          <h1 className="col-start-1 row-start-2 text-[1.375rem] sm:text-page">{title}</h1>
          {status && (
            <div className="col-start-2 row-start-1 justify-self-end sm:contents">{status}</div>
          )}
        </div>
      </div>
      {actions && (
        <div className="col-start-2 row-start-2 flex flex-wrap items-center justify-end gap-2">
          {actions}
        </div>
      )}
    </header>
  );

  if (!pinned && !below) return header;

  return (
    <div
      className={cn(
        pinned &&
          // Completely opaque - the page passes under it with a hard edge, nothing shines through -
          // and above the page's cards (z-20: the grid's own sticky names are z-10). Its padding
          // below keeps the page's cards from touching the text; the negative bottom margin takes
          // that padding back, so the layout below does not move.
          'sticky top-0 z-20 -mb-2 bg-bg pb-2',
      )}
    >
      {header}
      {below && <div className="mt-4">{below}</div>}
    </div>
  );
}
