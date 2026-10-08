import { ApiError } from '@/shared/api';

/** An `ApiError` as the client would raise it for a server answer. */
export function apiError(
  status: number,
  body: { title?: string; detail?: string; fieldErrors?: Record<string, string[]> } = {},
): ApiError {
  return new ApiError(status, {
    title: body.title ?? null,
    detail: body.detail ?? null,
    fieldErrors: body.fieldErrors ?? {},
  });
}
