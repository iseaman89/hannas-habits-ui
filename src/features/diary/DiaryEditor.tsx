import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { TodayHabitsCard, type HabitsGateway } from '@/features/habits';
import type { DiaryDraft } from './diaryDraft';
import type { DiaryGateway } from './diaryGateway';
import { diaryKeys } from './diaryQueries';
import { DiaryHeader } from './DiaryHeader';
import { EntryList } from './EntryList';
import { HighlightCard } from './HighlightCard';
import { MoodPicker } from './MoodPicker';
import { ScaleCard } from './ScaleCard';
import { TaskList } from './TaskList';
import { useDayAutosave } from './useDayAutosave';

interface DiaryEditorProps {
  /** The day, `yyyy-MM-dd`, and the same as a local date. */
  date: string;
  day: Date;
  /** The day as it was when the editor opened; later changes are the editor's own. */
  initial: DiaryDraft;
  gateway: DiaryGateway;
  habitsGateway?: HabitsGateway;
}

/**
 * One day's form with autosave. Mount it once per day (`key={date}`): it keeps the draft in its
 * own state - a controlled input must update in the same tick as the keystroke, which the query
 * cache's asynchronous notifications do not do - and hands every change to the autosaver.
 *
 * On leaving the day the draft is written to the cache and sent at once. The cache matters:
 * coming back to the day then shows what the person left, not the server's older copy while the
 * last write is still on its way.
 */
export function DiaryEditor({ date, day, initial, gateway, habitsGateway }: DiaryEditorProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(initial);
  // The newest draft, readable by two changes in one event (a state update would not be yet).
  const latest = useRef(initial);
  const { saver, status } = useDayAutosave(gateway, date, format(day, 'd MMM'));

  function update(patch: Partial<DiaryDraft>) {
    const next = { ...latest.current, ...patch };
    latest.current = next;
    setDraft(next);
    saver.change(next);
  }

  useEffect(
    () => () => {
      // Only into a cache that still has the day: after a log-out the cache was emptied, and
      // this person's text must not be put back for whoever signs in next.
      if (queryClient.getQueryState(diaryKeys.day(date))) {
        queryClient.setQueryData(diaryKeys.day(date), latest.current);
      }
      void saver.flush();
    },
    [queryClient, date, saver],
  );

  return (
    <>
      <DiaryHeader day={day} status={status} onRetry={() => void saver.flush()} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <MoodPicker value={draft.mood} onChange={(mood) => update({ mood })} />

          <div className="grid gap-6 sm:grid-cols-2">
            <ScaleCard
              title="Body"
              low="Drained"
              high="Energised"
              tone="accent-2"
              value={draft.body}
              onChange={(body) => update({ body })}
            />
            <ScaleCard
              title="Mind"
              low="Foggy"
              high="Clear"
              tone="accent"
              value={draft.mind}
              onChange={(mind) => update({ mind })}
            />
          </div>

          <HighlightCard value={draft.highlight} onChange={(highlight) => update({ highlight })} />

          <div className="grid gap-6 sm:grid-cols-2">
            <EntryList
              title="Grateful for"
              addLabel="Add something you are grateful for"
              placeholder="Add something…"
              tone="sage"
              items={draft.grateful}
              onChange={(grateful) => update({ grateful })}
            />
            <EntryList
              title="Something I learnt"
              addLabel="Add something you learnt"
              placeholder="Add something…"
              tone="accent"
              items={draft.learned}
              onChange={(learned) => update({ learned })}
            />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <TodayHabitsCard date={date} gateway={habitsGateway} />
          <TaskList tasks={draft.tasks} onChange={(tasks) => update({ tasks })} />
        </div>
      </div>
    </>
  );
}
