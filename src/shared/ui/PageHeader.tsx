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
  className?: string;
}

/**
 * The heading of a screen. It also names the screen in the browser tab ("<title> · <kicker> ·
 * Hanna's Habits"): every screen has exactly one header, so this is the one place for it.
 */
export function PageHeader({ kicker, title, status, actions, className }: PageHeaderProps) {
  useDocumentTitle(
    typeof title === 'string' || typeof title === 'number' ? `${title} · ${kicker}` : null,
  );

  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div>
        <p className="text-kicker font-bold uppercase tracking-[0.1em] text-accent-700">{kicker}</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[2rem] sm:text-page">{title}</h1>
          {status}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
