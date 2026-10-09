import { Navigate, useParams } from 'react-router-dom';
import { errorMessage } from '@/shared/api';
import { parseApiDate, toApiDate } from '@/shared/lib/dates';
import { Button, FormMessage } from '@/shared/ui';
import type { HabitsGateway } from '@/features/habits';
import { DiaryEditor } from './DiaryEditor';
import { diaryGateway, type DiaryGateway } from './diaryGateway';
import { useDiaryDay } from './diaryQueries';
import { DiaryHeader } from './DiaryHeader';
import { DiarySkeleton } from './DiarySkeleton';

interface DiaryPageProps {
  gateway?: DiaryGateway;
  /** For the "habits of the day" card; its own app gateway when left out. */
  habitsGateway?: HabitsGateway;
}

/**
 * `/diary/:date`: one day's diary (DESIGN.md §4.2). The date is the key - there are no ids - so
 * a link, a reload and the back button all land on the same day. A date that is not a real
 * `yyyy-MM-dd` day goes to today, like a nonsense month does on the habits screen.
 */
export function DiaryPage({ gateway = diaryGateway, habitsGateway }: DiaryPageProps) {
  const { date = '' } = useParams();
  const day = parseApiDate(date);

  if (!day) return <Navigate to={`/diary/${toApiDate(new Date())}`} replace />;

  // `key`: each day gets its own editor (and with it its own autosaver and draft).
  return (
    <DiaryDay key={date} date={date} day={day} gateway={gateway} habitsGateway={habitsGateway} />
  );
}

interface DiaryDayProps {
  date: string;
  day: Date;
  gateway: DiaryGateway;
  habitsGateway?: HabitsGateway;
}

function DiaryDay({ date, day, gateway, habitsGateway }: DiaryDayProps) {
  const loaded = useDiaryDay(gateway, date);

  if (loaded.data !== undefined) {
    return (
      <DiaryEditor
        date={date}
        day={day}
        initial={loaded.data}
        gateway={gateway}
        habitsGateway={habitsGateway}
      />
    );
  }

  return (
    <>
      <DiaryHeader day={day} />
      <div className="mt-4 sm:mt-6">
        {loaded.isError ? (
          <div className="flex flex-col items-start gap-4">
            <FormMessage message={errorMessage(loaded.error, 'This day could not be loaded.')} />
            <Button variant="secondary" onClick={() => void loaded.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <DiarySkeleton />
        )}
      </div>
    </>
  );
}
