import {
  AxiosError,
  CanceledError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { describe, expect, it } from 'vitest';
import { ApiError, NO_RESPONSE, errorMessage, toApiError } from './problem';

function failedWith(status: number, data: unknown): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  const response = { status, data, statusText: '', headers: {}, config } as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, response);
}

describe('toApiError', () => {
  it('reads title and detail of a ProblemDetails answer', () => {
    const error = toApiError(
      failedWith(404, { title: 'Not Found', detail: 'Habit not found.', status: 404 }),
    );

    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.status).toBe(404);
    expect(apiError.title).toBe('Not Found');
    expect(apiError.detail).toBe('Habit not found.');
    expect(apiError.message).toBe('Habit not found.'); // the specific part wins
    expect(apiError.fieldErrors).toEqual({});
  });

  it('keeps the validation messages per field', () => {
    const error = toApiError(
      failedWith(400, {
        title: 'One or more validation errors occurred.',
        errors: { title: ['Title is required.'], 'tasks[0].title': ['Too long.', 'Blank.'] },
      }),
    ) as ApiError;

    expect(error.status).toBe(400);
    expect(error.message).toBe('One or more validation errors occurred.');
    expect(error.fieldErrors).toEqual({
      title: ['Title is required.'],
      'tasks[0].title': ['Too long.', 'Blank.'],
    });
  });

  it('survives an answer that is not ProblemDetails (a proxy error page)', () => {
    const error = toApiError(failedWith(502, '<html>Bad Gateway</html>')) as ApiError;

    expect(error.status).toBe(502);
    expect(error.title).toBeNull();
    expect(error.message).toBe('The server ran into a problem. Please try again later.');
  });

  it('ignores field errors that are not lists of strings', () => {
    const error = toApiError(
      failedWith(400, { errors: { title: 'oops', ok: ['fine', 3, 'also fine'] } }),
    ) as ApiError;

    expect(error.fieldErrors).toEqual({ ok: ['fine', 'also fine'] });
  });

  it('turns "no answer" into status 0', () => {
    const error = toApiError(new AxiosError('Network Error', AxiosError.ERR_NETWORK)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(NO_RESPONSE);
    expect(error.isNetworkError).toBe(true);
    expect(error.message).toBe('The server cannot be reached. Check your connection.');
  });

  it('keeps the axios error as the cause', () => {
    const original = failedWith(500, null);

    expect((toApiError(original) as ApiError).cause).toBe(original);
  });

  it('leaves a cancelled request alone, so callers can still recognise the cancellation', () => {
    const cancelled = new CanceledError();

    expect(toApiError(cancelled)).toBe(cancelled);
  });

  it('leaves errors that are not from the network alone (our own bugs must not be disguised)', () => {
    const bug = new TypeError('x is not a function');

    expect(toApiError(bug)).toBe(bug);
  });

  it('does not wrap an ApiError twice', () => {
    const error = new ApiError(401, { title: null, detail: null, fieldErrors: {} });

    expect(toApiError(error)).toBe(error);
  });
});

describe('errorMessage', () => {
  it('shows the message of an ApiError', () => {
    const error = new ApiError(409, {
      title: 'Conflict',
      detail: 'Email is taken.',
      fieldErrors: {},
    });

    expect(errorMessage(error)).toBe('Email is taken.');
  });

  it('uses the fallback for anything else', () => {
    expect(errorMessage(new TypeError('internal detail'), 'Could not save.')).toBe(
      'Could not save.',
    );
    expect(errorMessage('weird')).toBe('Something went wrong. Please try again.');
  });
});
