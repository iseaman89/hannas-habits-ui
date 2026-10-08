import { Card, ProgressDonut } from '@/shared/ui';
import { describeYear, type YearProgress } from './yearProgress';

interface YearProgressCardProps {
  year: number;
  progress: YearProgress;
  /** `null` while the list is not there (loading, failed): the card then has no count to give. */
  counts: { kept: number; total: number } | null;
}

/** How far the year has come, and how much of it the resolutions have been kept (DESIGN.md §4.5). */
export function YearProgressCard({ year, progress, counts }: YearProgressCardProps) {
  const { caption, summary } = describeYear(year, progress, counts?.kept ?? 0, counts?.total ?? 0);
  const percent = Math.round(progress.percent);
  // A year that has not begun has no "percent behind you": the caption says it all.
  const label = progress.phase === 'future' ? caption : `${percent}% ${caption}`;

  return (
    <Card className="flex flex-col items-center gap-3 text-center">
      <ProgressDonut value={progress.percent} label={label} />
      <p className="text-sm font-semibold">{caption}</p>
      {counts && <p className="text-sm text-neutral-800">{summary}</p>}
    </Card>
  );
}
