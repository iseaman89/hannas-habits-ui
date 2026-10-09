import { useId } from 'react';
import { Card, Textarea } from '@/shared/ui';
import { DIARY_LIMITS } from './diaryDraft';

/** The day's one thing worth remembering, written straight into the card. */
export function HighlightCard({
  value,
  onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) {
  const id = useId();

  return (
    <Card>
      <label htmlFor={id} className="font-display text-card">
        Highlight of the day
      </label>
      <Textarea
        id={id}
        bare
        rows={5}
        maxLength={DIARY_LIMITS.highlight}
        placeholder="What made today worth remembering?"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3"
      />
    </Card>
  );
}
