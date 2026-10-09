import { z } from 'zod';
import type { Resolution, ResolutionInput } from './resolutionsGateway';

/**
 * What the form checks before it sends anything. The limits mirror the backend's
 * (`Resolution.TitleMaxLength`, `MaxPerYear`); the server stays the
 * authority and its answer is shown if it ever disagrees.
 */
export const TITLE_MAX_LENGTH = 200;
export const MAX_PER_YEAR = 50;

const title = z
  .string()
  .trim()
  .min(1, 'Give the resolution a name.')
  .max(TITLE_MAX_LENGTH, `Use at most ${TITLE_MAX_LENGTH} characters.`);

/** The add row: just a title. */
export const newResolutionSchema = z.object({ title });
export type NewResolutionValues = z.infer<typeof newResolutionSchema>;

/**
 * The edit dialog. `habitId` is the select's value: the habit's id, or `''` for "no habit" (a
 * `<select>` has no `null`). Named like the API's field, so a server complaint
 * (`errors.habitId`) finds it by itself.
 */
export const resolutionSchema = z.object({ title, habitId: z.string() });
export type ResolutionValues = z.infer<typeof resolutionSchema>;

export function toResolutionValues(item: Resolution): ResolutionValues {
  return { title: item.title, habitId: item.habitId ?? '' };
}

export function toResolutionInput(values: ResolutionValues): ResolutionInput {
  return { title: values.title, habitId: values.habitId === '' ? null : values.habitId };
}
