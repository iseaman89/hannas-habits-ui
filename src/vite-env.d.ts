/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the backend API including the `/api` prefix. */
  readonly VITE_API_URL: string;
  /** Public OAuth client id (same value as the backend's `Google:ClientId`). */
  readonly VITE_GOOGLE_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
