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
      <div className="@container flex flex-col gap-6">
        <div className="flex flex-col gap-6 @xl:flex-row @xl:items-center">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-8 w-40 rounded-full" />
            <Skeleton className="h-5 w-56 rounded-full" />
          </div>
          <Skeleton className="h-32 rounded-card @xl:w-86" />
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
