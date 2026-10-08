import { isAxiosError } from 'axios';

/** `status` of an `ApiError` when the request got no answer at all (offline, CORS, timeout). */
export const NO_RESPONSE = 0;

interface ProblemBody {
  title: string | null;
  detail: string | null;
  fieldErrors: Record<string, string[]>;
}

/**
 * Every failed call of the API client ends up as one of these, so a component never has to know
 * about axios. The server answers errors as ProblemDetails; a 400 from validation additionally
 * carries `errors`, a map from field (camelCase, e.g. `title`, `tasks[0].title`) to messages.
 */
export class ApiError extends Error {
  /** HTTP status, or `NO_RESPONSE` (0) when there was no answer. */
  readonly status: number;
  readonly title: string | null;
  readonly detail: string | null;
  /** Validation messages per field; empty for everything that is not a validation failure. */
  readonly fieldErrors: Readonly<Record<string, readonly string[]>>;

  constructor(
    status: number,
    { title, detail, fieldErrors }: ProblemBody,
    options?: { cause?: unknown },
  ) {
    super(detail ?? title ?? defaultMessage(status), options);
    this.name = 'ApiError';
    this.status = status;
    this.title = title;
    this.detail = detail;
    this.fieldErrors = fieldErrors;
  }

  /** The server could not be reached (offline, DNS, CORS, timeout). Worth a retry. */
  get isNetworkError(): boolean {
    return this.status === NO_RESPONSE;
  }
}

function defaultMessage(status: number): string {
  if (status === NO_RESPONSE) return 'The server cannot be reached. Check your connection.';
  if (status >= 500) return 'The server ran into a problem. Please try again later.';
  return `The request failed (HTTP ${status}).`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Reads a ProblemDetails body defensively: a proxy's HTML error page is not one. */
function readProblem(data: unknown): ProblemBody {
  if (!isRecord(data)) return { title: null, detail: null, fieldErrors: {} };

  const fieldErrors: Record<string, string[]> = {};
  if (isRecord(data.errors)) {
    for (const [field, messages] of Object.entries(data.errors)) {
      if (Array.isArray(messages)) {
        fieldErrors[field] = messages.filter((m): m is string => typeof m === 'string');
      }
    }
  }

  return {
    title: typeof data.title === 'string' ? data.title : null,
    detail: typeof data.detail === 'string' ? data.detail : null,
    fieldErrors,
  };
}

/**
 * Turns a failed axios call into an `ApiError`. Anything else (a cancelled request, a bug in our
 * own code) is returned unchanged: cancelling must stay recognisable for TanStack Query.
 */
export function toApiError(error: unknown): unknown {
  if (error instanceof ApiError) return error;
  if (!isAxiosError(error)) return error;

  if (error.code === 'ERR_CANCELED') return error;

  if (error.response) {
    return new ApiError(error.response.status, readProblem(error.response.data), { cause: error });
  }
  return new ApiError(
    NO_RESPONSE,
    { title: null, detail: null, fieldErrors: {} },
    { cause: error },
  );
}

/** The message to show a person for any error; `fallback` for errors that are not an `ApiError`. */
export function errorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  return error instanceof ApiError ? error.message : fallback;
}
