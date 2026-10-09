import { Annoyed, Frown, Laugh, Meh, Smile, type LucideIcon } from 'lucide-react';
import type { Mood } from './diaryDraft';

interface MoodOption {
  value: Mood;
  label: string;
  Icon: LucideIcon;
  /** The mood's own colour when chosen (written out in full, so Tailwind finds the classes). */
  chosen: string;
}

/** Great to Rough, left to right (DESIGN.md §4.2). The API's number grows with the mood. */
export const MOODS: readonly MoodOption[] = [
  { value: 5, label: 'Great', Icon: Laugh, chosen: 'bg-mood-great text-on-mood-great' },
  { value: 4, label: 'Good', Icon: Smile, chosen: 'bg-mood-good text-on-mood-good' },
  { value: 3, label: 'Okay', Icon: Meh, chosen: 'bg-mood-okay text-on-mood-okay' },
  { value: 2, label: 'Low', Icon: Frown, chosen: 'bg-mood-low text-on-mood-low' },
  { value: 1, label: 'Rough', Icon: Annoyed, chosen: 'bg-mood-rough text-on-mood-rough' },
];
