import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/api';
import { createQueryClient, shouldRetry } from './queryClient';

const apiError = (status: number) =>
  new ApiError(status, { title: null, detail: null, fieldErrors: {} });

describe('shouldRetry', () => {
  it.each([400, 401, 403, 404, 409, 429])(
    'does not retry a %i: asking again changes nothing',
    (status) => {
      expect(shouldRetry(0, apiError(status))).toBe(false);
    },
  );

  it.each([0, 500, 502, 503])('retries a %i, twice', (status) => {
    expect(shouldRetry(0, apiError(status))).toBe(true);
    expect(shouldRetry(1, apiError(status))).toBe(true);
    expect(shouldRetry(2, apiError(status))).toBe(false);
  });

  it('treats a bug in our own code like a temporary failure, but gives up soon', () => {
    expect(shouldRetry(0, new TypeError('x'))).toBe(true);
    expect(shouldRetry(2, new TypeError('x'))).toBe(false);
  });
});

describe('createQueryClient', () => {
  it('uses that rule for queries and never repeats a write', () => {
    const { queries, mutations } = createQueryClient().getDefaultOptions();

    expect(queries?.retry).toBe(shouldRetry);
    expect(mutations?.retry).toBe(false);
  });

  it('gives every app its own cache', () => {
    expect(createQueryClient()).not.toBe(createQueryClient());
  });
});
