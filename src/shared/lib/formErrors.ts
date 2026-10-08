import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError, errorMessage } from '@/shared/api';

/**
 * Puts what the server said about a submitted form where the person can act on it.
 *
 * A 400 from validation names fields (`errors.email`, camelCase like the form's field names):
 * each one that the form has is shown under its input and the first gets focus. Everything else
 * (wrong password, locked account, no network, a field the form does not show) cannot be pinned
 * to an input, so it is returned as the message for the whole form; `null` means every complaint
 * found its field.
 *
 *     const message = applyServerError(error, setError, ['email', 'password']);
 */
export function applyServerError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  if (!(error instanceof ApiError)) return errorMessage(error);

  let pinned = 0;
  let allPinned = true;
  for (const [key, messages] of Object.entries(error.fieldErrors)) {
    const field = fields.find((candidate) => candidate === key);
    if (!field || messages.length === 0) {
      allPinned = false;
      continue;
    }
    // One line per complaint (the password policy comes as several rules; `Field` keeps the breaks).
    setError(
      field,
      { type: 'server', message: messages.join('\n') },
      { shouldFocus: pinned === 0 },
    );
    pinned++;
  }

  return pinned > 0 && allPinned ? null : error.message;
}
