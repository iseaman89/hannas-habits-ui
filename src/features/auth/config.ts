/**
 * Public OAuth client id for "Continue with Google" (the same value as the backend's
 * `Google:ClientId`). Empty means Google sign-in is not set up in this environment: the button is
 * left out and the e-mail login works on its own.
 */
export const GOOGLE_CLIENT_ID: string | null =
  import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || null;
