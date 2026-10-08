import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { habitsGateway, type HabitsGateway } from '@/features/habits';
import { errorMessage } from '@/shared/api';
import {
  Button,
  Card,
  FormMessage,
  IconButton,
  PageHeader,
  Skeleton,
  SkeletonGroup,
} from '@/shared/ui';
import { AddResolutionRow } from './AddResolutionRow';
import { DeleteResolutionDialog } from './DeleteResolutionDialog';
import { EditResolutionDialog } from './EditResolutionDialog';
import { useToggleKept } from './resolutionMutations';
import { useResolutions } from './resolutionQueries';
import { MAX_PER_YEAR } from './resolutionSchema';
import { resolutionsGateway, type ResolutionsGateway } from './resolutionsGateway';
import { ResolutionRow } from './ResolutionRow';
import { yearProgress } from './yearProgress';
import { YearProgressCard } from './YearProgressCard';
import { FIRST_YEAR, LAST_YEAR, parseYearParam } from './years';

type DialogState = { kind: 'none' } | { kind: 'edit'; id: string } | { kind: 'delete'; id: string };

interface ResolutionsPageProps {
  gateway?: ResolutionsGateway;
  /** For the habit picker of the edit dialog. */
  habits?: HabitsGateway;
}

/**
 * The year's resolutions (DESIGN.md §4.5): a numbered list to add to, mark kept, edit and delete,
 * and a card with how far the year has come. The year is part of the address (`?year=2027`), so a
 * reload and the back button stay where the person was; next year can be planned in advance.
 * A dialog is addressed by the item's id and looks the item up in the list on every render, so
 * what the dialog shows is what the list holds now - and it closes by itself if the item is gone.
 */
export function ResolutionsPage({
  gateway = resolutionsGateway,
  habits = habitsGateway,
}: ResolutionsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' });

  const now = new Date();
  const currentYear = now.getFullYear();
  const year = parseYearParam(searchParams.get('year')) ?? currentYear;

  const resolutions = useResolutions(gateway, year);
  const toggleKept = useToggleKept(gateway);

  function showYear(target: number) {
    // The current year is the default: keep its address clean.
    setSearchParams(target === currentYear ? {} : { year: String(target) });
  }

  const list = resolutions.data;
  const counts = list
    ? { kept: list.filter((item) => item.kept).length, total: list.length }
    : null;
  const itemOf = (id: string) => list?.find((item) => item.id === id) ?? null;
  const closeDialog = () => setDialog({ kind: 'none' });

  /** What the list card shows. Data that is there wins: a refresh that fails must not wipe the list. */
  function renderBody() {
    if (list === undefined) {
      if (!resolutions.isError) {
        return (
          <SkeletonGroup label="Loading resolutions" className="flex flex-col gap-4">
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-14 rounded-full" />
            ))}
          </SkeletonGroup>
        );
      }
      return (
        <div className="flex flex-col items-start gap-4">
          <FormMessage
            message={errorMessage(resolutions.error, 'The resolutions could not be loaded.')}
          />
          <Button variant="secondary" onClick={() => void resolutions.refetch()}>
            Try again
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        {list.length === 0 ? (
          <p className="text-neutral-800">
            No resolutions for {year} yet. Write the first one below.
          </p>
        ) : (
          <ol>
            {list.map((item, index) => (
              <ResolutionRow
                key={item.id}
                item={item}
                number={index + 1}
                onToggleKept={(target, kept) => toggleKept.mutate({ year, item: target, kept })}
                onEdit={(target) => setDialog({ kind: 'edit', id: target.id })}
                onDelete={(target) => setDialog({ kind: 'delete', id: target.id })}
              />
            ))}
          </ol>
        )}

        {list.length >= MAX_PER_YEAR ? (
          <p className="text-sm text-neutral-700">
            That is the most a year holds ({MAX_PER_YEAR}).
          </p>
        ) : (
          // Another year, another row: what was typed for one year is not added to the next.
          <AddResolutionRow key={year} gateway={gateway} year={year} />
        )}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        kicker="Resolutions"
        title={`My ${year}`}
        actions={
          <>
            {year !== currentYear && (
              <Button variant="ghost" size="sm" onClick={() => showYear(currentYear)}>
                This year
              </Button>
            )}
            <IconButton
              label="Previous year"
              variant="secondary"
              disabled={year <= FIRST_YEAR}
              onClick={() => showYear(year - 1)}
            >
              <ChevronLeft />
            </IconButton>
            <IconButton
              label="Next year"
              variant="secondary"
              disabled={year >= LAST_YEAR}
              onClick={() => showYear(year + 1)}
            >
              <ChevronRight />
            </IconButton>
          </>
        }
      />

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_16.25rem]">
        <Card>{renderBody()}</Card>
        <aside aria-label={`Progress of ${year}`}>
          <YearProgressCard year={year} progress={yearProgress(year, now)} counts={counts} />
        </aside>
      </div>

      <EditResolutionDialog
        gateway={gateway}
        habits={habits}
        year={year}
        item={dialog.kind === 'edit' ? itemOf(dialog.id) : null}
        onClose={closeDialog}
      />
      <DeleteResolutionDialog
        gateway={gateway}
        year={year}
        item={dialog.kind === 'delete' ? itemOf(dialog.id) : null}
        onClose={closeDialog}
      />
    </>
  );
}
