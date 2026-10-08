import { apiUrlProblem } from './apiUrl';

const configured = import.meta.env.VITE_API_URL;

// The start-up check in main.tsx shows this problem on a page of its own before this file is
// ever loaded; the throw is the second lock for anything that imports the client regardless.
// (VITE_* values are inlined at build time; in Docker they are build arguments.)
const problem = apiUrlProblem(configured);
if (problem) {
  throw new Error(`${problem} Copy .env.example to .env.`);
}

/** Backend base URL including the `/api` prefix, without a trailing slash. */
export const API_BASE_URL = configured.trim().replace(/\/+$/, '');
