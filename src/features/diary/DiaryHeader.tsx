import { addDays } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toApiDate } from '@/shared/lib/dates';
import { useToday } from '@/shared/lib/useToday';
import { IconButton, PageHeader } from '@/shared/ui';
import type { SaveStatus } from './autosave';
import { dayTitle } from './diaryDates';
import { SavedIndicator } from './SavedIndicator';

interface DiaryHeaderProps {
  /** The day being shown (local midnight). */
  day: Date;
  /** Not given while the day is still loading: nothing to be saved yet. */
  status?: SaveStatus;
  onRetry?: () => void;
}

/** Kicker, the date, the save status and the way to the days before and after. */
export function DiaryHeader({ day, status, onRetry }: DiaryHeaderProps) {
  const navigate = useNavigate();
  const showDay = (offset: number) => void navigate(`/diary/${toApiDate(addDays(day, offset))}`);
  // There is no diary for a day that has not begun.
  const today = useToday();
  const isLastDay = toApiDate(day) >= toApiDate(today);

  return (
    <PageHeader
      pinned
      kicker="Daily diary"
      title={dayTitle(day, today)}
      status={status && <SavedIndicator status={status} onRetry={onRetry ?? (() => undefined)} />}
      actions={
        <>
          <IconButton label="Previous day" variant="secondary" onClick={() => showDay(-1)}>
            <ChevronLeft />
          </IconButton>
          <IconButton
            label="Next day"
            variant="secondary"
            disabled={isLastDay}
            onClick={() => showDay(1)}
          >
            <ChevronRight />
          </IconButton>
        </>
      }
    />
  );
}
