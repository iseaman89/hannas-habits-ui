import { Card, PageHeader } from '@/shared/ui';

/** Placeholder: the year resolutions (DESIGN.md §4.5) are built in step F8. */
export function ResolutionsPage() {
  return (
    <>
      <PageHeader kicker="Resolutions" title="Resolutions" />
      <Card className="mt-6">
        <p className="text-neutral-700">This screen is built in step F8.</p>
      </Card>
    </>
  );
}
