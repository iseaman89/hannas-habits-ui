import { useEffect, useId, useRef, type ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  /** Asked for by Escape or a click on the backdrop. The parent decides by setting `open`. */
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Buttons row at the bottom (Cancel / confirm). */
  actions?: ReactNode;
}

/**
 * A modal dialog on the platform's <dialog> element: the browser traps and restores focus,
 * makes the page behind inert and puts the dialog above everything else. That is the part a
 * home-made modal gets wrong; react-modal (used by the old UI) re-implements it.
 *
 * Controlled: Escape and a backdrop click only *ask* via `onClose`. The content is mounted only
 * while open, so a form inside starts fresh every time.
 */
export function Dialog({ open, onClose, title, children, actions }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // The click handler is mouse sugar; the keyboard way out is Escape (onCancel).
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault(); // stay controlled: the parent closes us by clearing `open`
        onClose();
      }}
      onClick={(event) => {
        // The dialog has no padding of its own, so a click on the dialog element itself is a
        // click on the ::backdrop.
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-card bg-surface p-0 text-text shadow-lg backdrop:bg-backdrop"
    >
      {open && (
        <div className="flex flex-col gap-5 p-8">
          <h2 id={titleId} className="text-dialog">
            {title}
          </h2>
          {children}
          {actions && <div className="flex flex-wrap justify-end gap-2">{actions}</div>}
        </div>
      )}
    </dialog>
  );
}
