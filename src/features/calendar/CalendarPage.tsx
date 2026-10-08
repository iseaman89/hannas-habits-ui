import { Card, PageHeader } from '@/shared/ui';

/** Placeholder: the year calendar (DESIGN.md §4.4) is built in step F7. */
export function CalendarPage() {
  return (
    <>
      <PageHeader kicker="Calendar" title="Calendar" />
      <Card className="mt-6">
        <p className="text-neutral-700">This screen is built in step F7.</p>
      </Card>
    </>
  );
}
