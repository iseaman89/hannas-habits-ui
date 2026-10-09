import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { IconButton } from './Button';
import { ToastContext, type ToastApi, type ToastKind } from './toast-context';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

/** Errors stay longer: they are the ones a person needs time to read. */
const DURATION_MS: Record<ToastKind, number> = { success: 4000, info: 4000, error: 8000 };
const MAX_VISIBLE = 3;

const kinds = {
  success: { Icon: CircleCheck, style: 'bg-accent-2-200 text-accent-2-900' },
  info: { Icon: Info, style: 'bg-neutral-200 text-neutral-900' },
  error: { Icon: CircleAlert, style: 'bg-accent-200 text-accent-900' },
} as const;

/**
 * One place for short feedback ("Habit created", "Could not save"). Hand-written because it is
 * small (a list, a timer per item, a live region) and keeps the look of the design; if it ever
 * needs stacking animation, swipe-to-dismiss or pause-on-hover, take a library instead.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, kind, message }].slice(-MAX_VISIBLE));
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DURATION_MS[kind]),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message) => show('success', message),
      error: (message) => show('error', message),
      info: (message) => show('info', message),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end">
        {toasts.map(({ id, kind, message }) => {
          const { Icon, style } = kinds[kind];
          return (
            <div
              key={id}
              role={kind === 'error' ? 'alert' : 'status'}
              className={cn(
                'pointer-events-auto flex max-w-sm animate-toast-in items-center gap-3 rounded-full py-2 pr-2 pl-5 font-semibold shadow-lg',
                style,
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              <span>{message}</span>
              <IconButton label="Dismiss" size="sm" onClick={() => dismiss(id)}>
                <X aria-hidden />
              </IconButton>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
