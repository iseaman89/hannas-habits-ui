import { useEffect, useState, useSyncExternalStore } from 'react';
import { errorMessage } from '@/shared/api';
import { useToast } from '@/shared/ui';
import { createAutosaver, type Autosaver, type SaveStatus } from './autosave';
import { toRequest, type DiaryDraft } from './diaryDraft';
import type { DiaryGateway } from './diaryGateway';

/** A pause this long after the last edit writes the day: short enough to feel saved, long enough not to write every keystroke. */
export const SAVE_DELAY_MS = 800;

/**
 * The autosaver of one day, as the screen needs it: its status as React state, a toast when a
 * write fails, and the two moments the page itself cannot wait for.
 *
 * - **The tab is hidden** (the person switches away or closes it): what is waiting is written now
 *   instead of after the pause.
 * - **The tab is about to unload** with something unwritten: the browser's own "leave this
 *   page?" prompt. A failed write is the case it is for - the draft only lives in this tab.
 *
 * Leaving the day (another date, another screen) is the editor's business: it knows the draft.
 */
export function useDayAutosave(
  gateway: DiaryGateway,
  date: string,
  /** The day for a human ("7 Oct"), for the failure message. */
  dayLabel: string,
): { saver: Autosaver<DiaryDraft>; status: SaveStatus } {
  const toast = useToast();

  // One per editor, created once: it holds the waiting draft and the one request in flight.
  const [saver] = useState(() =>
    createAutosaver<DiaryDraft>({
      delayMs: SAVE_DELAY_MS,
      save: (draft) => gateway.save(date, toRequest(draft)),
      onFailure: (error) =>
        toast.error(errorMessage(error, `Your diary for ${dayLabel} could not be saved.`)),
    }),
  );

  const status = useSyncExternalStore(saver.subscribe, saver.getStatus);

  useEffect(() => {
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden') void saver.flush();
    };
    const warnWhenUnsaved = (event: BeforeUnloadEvent) => {
      if (saver.getStatus() !== 'saved') event.preventDefault();
    };

    document.addEventListener('visibilitychange', flushWhenHidden);
    window.addEventListener('beforeunload', warnWhenUnsaved);
    return () => {
      document.removeEventListener('visibilitychange', flushWhenHidden);
      window.removeEventListener('beforeunload', warnWhenUnsaved);
    };
  }, [saver]);

  return { saver, status };
}
