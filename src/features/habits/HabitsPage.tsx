import { Card, PageHeader } from '@/shared/ui';

/** Placeholder: the month tracker (DESIGN.md §4.3) is built in step F5. */
export function HabitsPage() {
  return (
    <>
      <PageHeader kicker="Habits" title="Habits" />
      <Card className="mt-6">
        <p className="text-neutral-700">This screen is built in step F5.</p>
      </Card>
    </>
  );
}
