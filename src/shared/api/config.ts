const configured = import.meta.env.VITE_API_URL;

// Fail at start-up with a clear message instead of sending every request to the wrong place.
// (VITE_* values are inlined at build time; in Docker they are build arguments.)
if (!configured) {
  throw new Error(
    'VITE_API_URL is not set. Copy .env.example to .env (the backend URL including /api).',
  );
}

/** Backend base URL including the `/api` prefix, without a trailing slash. */
export const API_BASE_URL = configured.replace(/\/+$/, '');
