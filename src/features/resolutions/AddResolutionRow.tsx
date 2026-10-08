import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { applyServerError } from '@/shared/lib/formErrors';
import { FormMessage } from '@/shared/ui';
import { useAddResolution } from './resolutionMutations';
import {
  TITLE_MAX_LENGTH,
  newResolutionSchema,
  type NewResolutionValues,
} from './resolutionSchema';
import type { ResolutionsGateway } from './resolutionsGateway';

interface AddResolutionRowProps {
  gateway: ResolutionsGateway;
  year: number;
}

/**
 * The last row of the list: type a resolution and press Enter (or the plus) to add it to the
 * year. It adds on Enter only, not when the input is left: unlike the diary this is not an
 * autosaved document - nothing may be created behind the person's back. The server's refusals
 * ("at most 50 a year") are shown under the row and the text stays for another try.
 */
export function AddResolutionRow({ gateway, year }: AddResolutionRowProps) {
  const add = useAddResolution(gateway);
  const {
    register,
    handleSubmit,
    resetField,
    setError,
    setFocus,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<NewResolutionValues>({
    resolver: zodResolver(newResolutionSchema),
    defaultValues: { title: '' },
  });
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const canSubmit = watch('title').trim() !== '';

  const submit = handleSubmit(async (values) => {
    setFormMessage(null);
    try {
      await add.mutateAsync({ year, input: { title: values.title, habitId: null } });
      // `resetField`, not `reset`: reset also forgets the registered input, and the focus below
      // would find nothing to go to.
      resetField('title');
      // Clicking the plus took the focus away; the next resolution is typed straight after.
      setFocus('title');
    } catch (error) {
      setFormMessage(applyServerError(error, setError, ['title']));
    }
  });

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <button
          type="submit"
          aria-label="Add resolution"
          title="Add resolution"
          disabled={!canSubmit || isSubmitting}
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border-2 border-dashed border-neutral-500 text-neutral-700 transition-colors hover:bg-accent-100 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Plus aria-hidden className="size-5" />
        </button>
        <input
          type="text"
          aria-label="Add a resolution"
          placeholder="Add a resolution and press Enter"
          maxLength={TITLE_MAX_LENGTH}
          aria-invalid={errors.title ? true : undefined}
          className="min-w-0 flex-1 bg-transparent py-2 text-base text-text placeholder:text-neutral-600 focus-visible:outline-none"
          {...register('title')}
        />
      </div>
      <FormMessage message={errors.title?.message ?? formMessage} />
    </form>
  );
}
