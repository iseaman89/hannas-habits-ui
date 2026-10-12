import { useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';
import { errorMessage } from '@/shared/api';
import { parseApiDate } from '@/shared/lib/dates';
import {
  Button,
  Dialog,
  FormMessage,
  IconButton,
  Input,
  Skeleton,
  SkeletonGroup,
  useToast,
} from '@/shared/ui';
import { useDeleteTag, useRenameTag } from './tagMutations';
import { useTags } from './tagQueries';
import { MAX_TAG_NAME_LENGTH, cleanTagName, sameTagName } from './tagName';
import type { Tag, TagsGateway } from './tagsGateway';

interface ManageTagsDialogProps {
  gateway: TagsGateway;
  open: boolean;
  onClose: () => void;
  /**
   * Called after a rename, a merge or a delete went through. Days carry tags, so whoever shows
   * days must look again; this feature does not know who that is.
   */
  onTagsChanged: () => void;
}

/**
 * Rename, merge and delete a person's tags - across all habits. Putting a tag on a day happens
 * on the day, not here.
 */
export function ManageTagsDialog({ gateway, open, onClose, onTagsChanged }: ManageTagsDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Manage tags"
      actions={
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      }
    >
      {open && <ManageTagsContent gateway={gateway} onTagsChanged={onTagsChanged} />}
    </Dialog>
  );
}

function ManageTagsContent({
  gateway,
  onTagsChanged,
}: Pick<ManageTagsDialogProps, 'gateway' | 'onTagsChanged'>) {
  const tags = useTags(gateway);

  if (tags.data === undefined) {
    if (tags.isError) {
      return (
        <div className="flex flex-col items-start gap-4">
          <FormMessage message={errorMessage(tags.error, 'Your tags could not be loaded.')} />
          <Button variant="secondary" onClick={() => void tags.refetch()}>
            Try again
          </Button>
        </div>
      );
    }
    return (
      <SkeletonGroup label="Loading tags" className="flex flex-col gap-3">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-10" />
        ))}
      </SkeletonGroup>
    );
  }

  if (tags.data.length === 0) {
    return (
      <p className="text-neutral-800">
        You have no tags yet. Add one to a day in the habit grid and it will show up here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-700">
        Changes here apply to every habit. Renaming a tag to a name another tag has merges the two.
      </p>
      <ul className="-mt-1 max-h-[50vh] overflow-y-auto">
        {tags.data.map((tag) => (
          <TagRow
            key={tag.id}
            tag={tag}
            others={tags.data.filter((other) => other.id !== tag.id)}
            gateway={gateway}
            onTagsChanged={onTagsChanged}
          />
        ))}
      </ul>
    </div>
  );
}

type RowMode = 'view' | 'rename' | 'delete';

interface TagRowProps extends Pick<ManageTagsDialogProps, 'gateway' | 'onTagsChanged'> {
  tag: Tag;
  /** The person's other tags: renaming to one of their names merges. */
  others: readonly Tag[];
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

function usage(tag: Tag): string {
  if (tag.useCount === 0) return 'Not used yet';
  const last = tag.lastUsedOn ? parseApiDate(tag.lastUsedOn) : null;
  const days = `Used on ${plural(tag.useCount, 'day')}`;
  return last ? `${days}, last on ${format(last, 'd MMM yyyy')}` : days;
}

function TagRow({ tag, others, gateway, onTagsChanged }: TagRowProps) {
  const [mode, setMode] = useState<RowMode>('view');
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState(tag.name);
  const rename = useRenameTag(gateway);
  const remove = useDeleteTag(gateway);
  const toast = useToast();

  const cleaned = cleanTagName(name);
  const target = others.find((other) => sameTagName(other.name, cleaned));

  function show(next: RowMode) {
    setMessage(null);
    setName(tag.name);
    setMode(next);
  }

  async function submitRename(event: FormEvent) {
    event.preventDefault();
    if (cleaned === '' || cleaned === tag.name) return;
    setMessage(null);
    try {
      const result = await rename.mutateAsync({ id: tag.id, name: cleaned });
      if (result.merged) toast.success(`“${tag.name}” is merged into “${result.name}”.`);
      onTagsChanged();
      setMode('view');
    } catch (error) {
      setMessage(errorMessage(error, 'The tag could not be renamed.'));
    }
  }

  async function confirmDelete() {
    setMessage(null);
    try {
      const result = await remove.mutateAsync(tag.id);
      toast.success(
        result.removedFromDays === 0
          ? `“${tag.name}” deleted.`
          : `“${tag.name}” deleted and taken off ${plural(result.removedFromDays, 'day')}.`,
      );
      onTagsChanged();
    } catch (error) {
      setMessage(errorMessage(error, 'The tag could not be deleted.'));
    }
  }

  return (
    <li className="flex flex-col gap-2 border-t border-divider py-3 first:border-t-0">
      {mode === 'view' && (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold" title={tag.name}>
              {tag.name}
            </p>
            <p className="text-sm text-neutral-700">{usage(tag)}</p>
          </div>
          <IconButton label={`Rename ${tag.name}`} size="sm" onClick={() => show('rename')}>
            <Pencil />
          </IconButton>
          <IconButton label={`Delete ${tag.name}`} size="sm" onClick={() => show('delete')}>
            <Trash2 />
          </IconButton>
        </div>
      )}

      {mode === 'rename' && (
        <form className="flex flex-col gap-2" onSubmit={(event) => void submitRename(event)}>
          <div className="flex items-center gap-2">
            <Input
              aria-label={`New name for ${tag.name}`}
              value={name}
              maxLength={MAX_TAG_NAME_LENGTH}
              autoFocus
              onChange={(event) => setName(event.target.value)}
            />
            <Button type="submit" size="sm" loading={rename.isPending} disabled={cleaned === ''}>
              {target ? 'Merge' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => show('view')}>
              Cancel
            </Button>
          </div>
          {target && (
            <p className="px-3 text-sm text-neutral-700">
              “{target.name}” exists already. Saving moves every day of “{tag.name}” to it and
              removes “{tag.name}”.
            </p>
          )}
        </form>
      )}

      {mode === 'delete' && (
        <div className="flex flex-col gap-2">
          <p>
            Delete “{tag.name}”?{' '}
            {tag.useCount === 0
              ? 'It is not on any day.'
              : `It will be taken off ${plural(tag.useCount, 'day')}.`}
          </p>
          <div className="flex gap-2">
            <Button size="sm" loading={remove.isPending} onClick={() => void confirmDelete()}>
              Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => show('view')}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <FormMessage message={message} />
    </li>
  );
}
