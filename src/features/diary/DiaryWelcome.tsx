import { Card } from '@/shared/ui';
import type { Mood } from './diaryDraft';
import { DiaryGreeting } from './DiaryGreeting';
import { MoodPicker } from './MoodPicker';

interface DiaryWelcomeProps {
  /** The day being shown (local midnight). */
  day: Date;
  mood: Mood | null;
  onMoodChange: (mood: Mood | null) => void;
}

/**
 * The card that opens the day: the greeting and the five faces together - the question and its
 * answer in one place. The faces go under the sentence and, where the card is wide enough for both
 * (a container query: the diary's column is only two thirds of the page, so the screen's width
 * says little), beside it.
 */
export function DiaryWelcome({ day, mood, onMoodChange }: DiaryWelcomeProps) {
  return (
    <Card className="@container">
      <div className="flex flex-col gap-4 @3xl:flex-row @3xl:items-center @3xl:justify-between">
        <DiaryGreeting day={day} />
        <MoodPicker value={mood} onChange={onMoodChange} className="@3xl:shrink-0" />
      </div>
    </Card>
  );
}
