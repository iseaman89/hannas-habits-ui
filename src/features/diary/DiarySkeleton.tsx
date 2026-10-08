import { Skeleton, SkeletonGroup } from '@/shared/ui';

/**
 * The day's cards as grey blocks while the day is on its way. The grid is the editor's own
 * (`DiaryEditor`), so the page keeps its shape when the real cards replace the blocks.
 */
export function DiarySkeleton() {
  return (
    <SkeletonGroup
      label="Loading the diary"
      className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
    >
      <div className="flex flex-col gap-6">
        <Skeleton className="h-32 rounded-card" />
        <div className="grid gap-6 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-card" />
          <Skeleton className="h-28 rounded-card" />
        </div>
        <Skeleton className="h-44 rounded-card" />
      </div>
      <div className="flex flex-col gap-6">
        <Skeleton className="h-48 rounded-card" />
        <Skeleton className="h-56 rounded-card" />
      </div>
    </SkeletonGroup>
  );
}
