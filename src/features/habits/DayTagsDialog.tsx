import { useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { Plus, X } from 'lucide-react';
import {
  MAX_TAGS_PER_DAY,
  MAX_TAG_NAME_LENGTH,
  cleanTagName,
  matchTags,
  sameTagName,
  useTags,
  type TagSummary,
  type TagsGateway,
} from '@/features/tags';
import { errorMessage } from '@/shared/api';
import { cn } from '@/shared/lib/cn';
import { parseApiDate } from '@/shared/lib/dates';
import { Button, Dialog, Field, FormMessage, Input, Skeleton, SkeletonGroup } from '@/shared/ui';
import { useTagDay, useTagDayWithNewTag } from './habitMutations';
import type { HabitsGateway } from './habitsGateway';

/** How many suggestions are listed at once; typing narrows them. */
const SUGGESTION_LIMIT = 12;

export interface DayTagsTarget {
  habit: { id: string; title: string };
  /** `yyyy-MM-dd` */
  date: string;
  /** What the day carries now (from the overview, so an optimistic change shows at once). */
  tags: readonly TagSummary[];
}

interface DayTagsDialogProps {
  gateway: HabitsGateway;
  tagsGateway: TagsGateway;
  /** The day to tag; `null` = closed. */
  target: DayTagsTarget | null;
  onClose: () => void;
}

/**
 * The tags of one habit's day: the ones on it (with a way to take each off), a field to type a
 * name, and the person's existing tags as suggestions - the habit's own first. A name that does
 * not exist yet is offered as "Create". A modal dialog rather than a popover: positioning inside
 * a sideways-scrolling table, focus and touch are the platform's job here, and on a phone it is
 * the better shape anyway.
 */
export function DayTagsDialog({ gateway, tagsGateway, target, onClose }: DayTagsDialogProps) {
  const day = target ? parseApiDate(target.date) : null;
  return (
    <Dialog
      open={target !== null}
      onClose={onClose}
      title={day ? `Tags for ${format(day, 'EEEE d MMMM')}` : 'Tags'}
      actions={<Button onClick={onClose}>Done</Button>}
    >
      {target && <DayTagsContent gateway={gateway} tagsGateway={tagsGateway} target={target} />}
    </Dialog>
  );
}

const chipBase = 'inline-flex items-center rounded-full text-sm font-bold';

function DayTagsContent({
  gateway,
  tagsGateway,
  target,
}: {
  gateway: HabitsGateway;
  tagsGateway: TagsGateway;
  target: DayTagsTarget;
}) {
  const { habit, date, tags: dayTags } = target;
  const [typed, setTyped] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const known = useTags(tagsGateway, habit.id);
  const tagDay = useTagDay(gateway);
  const createAndTag = useTagDayWithNewTag(gateway, tagsGateway);

  const cleaned = cleanTagName(typed);
  const onDay = new Set(dayTags.map((tag) => tag.id));
  const all = known.data ?? [];
  const exact = all.find((tag) => sameTagName(tag.name, cleaned));
  const matches = matchTags(
    all.filter((tag) => !onDay.has(tag.id)),
    typed,
  );
  const shown = matches.slice(0, SUGGESTION_LIMIT);
  const canCreate = cleaned !== '' && exact === undefined;
  const full = dayTags.length >= MAX_TAGS_PER_DAY;

  function put(tag: TagSummary, present: boolean) {
    setMessage(null);
    tagDay.mutate({ habitId: habit.id, date, tag: { id: tag.id, name: tag.name }, present });
  }

  /** Enter and the "Create" chip: the typed name is an existing tag, or a new one. */
  async function commit() {
    if (cleaned === '' || full) return;
    setMessage(null);

    if (exact) {
      if (!onDay.has(exact.id)) put(exact, true);
      setTyped('');
      return;
    }

    try {
      await createAndTag.mutateAsync({ habitId: habit.id, date, name: cleaned });
      setTyped('');
    } catch (error) {
      // The name stays in the field: it is what the person has to correct.
      setMessage(errorMessage(error, 'The tag could not be created.'));
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void commit();
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="-mt-2 text-neutral-700">{habit.title}</p>

      {full ? (
        <p className="rounded-md bg-neutral-100 px-4 py-3 text-sm text-neutral-800">
          A day can have at most {MAX_TAGS_PER_DAY} tags. Take one off to add another.
        </p>
      ) : (
        <form onSubmit={submit}>
          <Field label="Add a tag" hint="Press Enter to add it.">
            {(control) => (
              <Input
                {...control}
                value={typed}
                maxLength={MAX_TAG_NAME_LENGTH}
                placeholder="e.g. sick, travelling"
                autoComplete="off"
                disabled={createAndTag.isPending}
                onChange={(event) => setTyped(event.target.value)}
              />
            )}
          </Field>
        </form>
      )}

      <FormMessage message={message} />

      <section aria-label="Tags on this day" className="flex flex-col gap-2">
        {dayTags.length === 0 ? (
          <p className="text-sm text-neutral-700">No tags on this day yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {dayTags.map((tag) => (
              <li
                key={tag.id}
                className={cn(chipBase, 'bg-accent-2-200 py-1 pl-3 pr-1 text-accent-2-800')}
              >
                <span className="max-w-48 truncate" title={tag.name}>
                  {tag.name}
                </span>
                <button
                  type="button"
                  aria-label={`Remove tag ${tag.name}`}
                  onClick={() => put(tag, false)}
                  className="ml-1 grid size-6 cursor-pointer place-items-center rounded-full hover:bg-accent-2-300"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!full && (
        <section aria-label="Suggestions" className="flex flex-col gap-2">
          {known.isPending && (
            <SkeletonGroup label="Loading your tags" className="flex flex-wrap gap-2">
              {[0, 1, 2].map((chip) => (
                <Skeleton key={chip} className="h-8 w-20 rounded-full" />
              ))}
            </SkeletonGroup>
          )}

          {known.isError && (
            <p className="text-sm text-neutral-700">
              Your tags could not be loaded. You can still type a name.{' '}
              <button
                type="button"
                className="cursor-pointer font-bold text-accent-700 underline"
                onClick={() => void known.refetch()}
              >
                Try again
              </button>
            </p>
          )}

          {(shown.length > 0 || canCreate) && (
            <ul className="flex flex-wrap gap-2">
              {canCreate && (
                <li>
                  <button
                    type="button"
                    disabled={createAndTag.isPending}
                    onClick={() => void commit()}
                    className={cn(
                      chipBase,
                      'cursor-pointer gap-1.5 border-2 border-dashed border-accent px-3 py-1',
                      'text-accent-700 hover:bg-accent-100 disabled:cursor-not-allowed disabled:opacity-45',
                    )}
                  >
                    <Plus className="size-4" aria-hidden />
                    Create “{cleaned}”
                  </button>
                </li>
              )}
              {shown.map((tag) => (
                <li key={tag.id}>
                  <button
                    type="button"
                    aria-label={`Add tag ${tag.name}`}
                    title={`Used on ${tag.useCount} days, ${tag.habitUseCount} for this habit`}
                    onClick={() => put(tag, true)}
                    className={cn(
                      chipBase,
                      'cursor-pointer gap-2 bg-neutral-200 px-3 py-1 text-neutral-800 hover:bg-neutral-300',
                    )}
                  >
                    <span className="max-w-48 truncate" aria-hidden>
                      {tag.name}
                    </span>
                    <span className="text-xs font-normal text-neutral-700" aria-hidden>
                      {tag.useCount}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {matches.length > shown.length && (
            <p className="text-sm text-neutral-700">Keep typing to narrow the list.</p>
          )}
          {known.data !== undefined && all.length === 0 && cleaned === '' && (
            <p className="text-sm text-neutral-700">
              You have no tags yet. Type a name to make the first one.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
