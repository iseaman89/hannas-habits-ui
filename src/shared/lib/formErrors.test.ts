import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/api';
import { applyServerError } from './formErrors';

interface Values {
  email: string;
  password: string;
}

/** Stands in for react-hook-form's `setError`; remembers what it was asked to show where. */
function recorder() {
  const calls: { field: string; message: string | undefined; shouldFocus: boolean | undefined }[] =
    [];
  const setError = (
    field: string,
    error: { type?: string; message?: string },
    options?: { shouldFocus?: boolean },
  ) => {
    calls.push({ field, message: error.message, shouldFocus: options?.shouldFocus });
  };
  return { calls, setError: setError as Parameters<typeof applyServerError<Values>>[1] };
}

function problem(
  status: number,
  body: { title?: string; detail?: string; fieldErrors?: Record<string, string[]> },
) {
  return new ApiError(status, {
    title: body.title ?? null,
    detail: body.detail ?? null,
    fieldErrors: body.fieldErrors ?? {},
  });
}

const fields = ['email', 'password'] as const;

describe('applyServerError', () => {
  it('shows each complaint under its field and focuses the first one only', () => {
    const { calls, setError } = recorder();
    const error = problem(400, {
      fieldErrors: { email: ['Not an email.'], password: ['Too short.', 'Needs a digit.'] },
    });

    const formMessage = applyServerError(error, setError, fields);

    expect(formMessage).toBeNull();
    expect(calls).toEqual([
      { field: 'email', message: 'Not an email.', shouldFocus: true },
      // One line per rule (the field keeps the line breaks), not four sentences run together.
      { field: 'password', message: 'Too short.\nNeeds a digit.', shouldFocus: false },
    ]);
  });

  it('returns a message for the whole form when a complaint has no field to go to', () => {
    const { calls, setError } = recorder();
    const error = problem(400, {
      title: 'One or more validation errors occurred.',
      fieldErrors: { email: ['Not an email.'], nickname: ['Unknown.'] },
    });

    expect(applyServerError(error, setError, fields)).toBe(
      'One or more validation errors occurred.',
    );
    // The part that does have a field is still shown there.
    expect(calls.map((c) => c.field)).toEqual(['email']);
  });

  it('prefers the detail of the problem over its title for the whole form', () => {
    const { calls, setError } = recorder();
    const error = problem(401, {
      title: 'Authentication failed.',
      detail: 'The email or password is incorrect.',
    });

    expect(applyServerError(error, setError, fields)).toBe('The email or password is incorrect.');
    expect(calls).toEqual([]);
  });

  it('says when the server cannot be reached', () => {
    const { setError } = recorder();

    expect(applyServerError(problem(0, {}), setError, fields)).toMatch(/cannot be reached/);
  });

  it('answers a bug of our own (not an ApiError) with the generic message', () => {
    const { calls, setError } = recorder();

    expect(applyServerError(new TypeError('boom'), setError, fields)).toBe(
      'Something went wrong. Please try again.',
    );
    expect(calls).toEqual([]);
  });
});
