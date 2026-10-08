import { useParams } from 'react-router-dom';
import { Card, PageHeader } from '@/shared/ui';

/** Placeholder: the daily diary (DESIGN.md §4.2) is built in step F6. */
export function DiaryPage() {
  const { date } = useParams();

  return (
    <>
      <PageHeader kicker="Daily diary" title={date ?? 'Today'} />
      <Card className="mt-6">
        <p className="text-neutral-700">This screen is built in step F6.</p>
      </Card>
    </>
  );
}
