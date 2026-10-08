# Hanna's Habits — Frontend

React 18 + Vite 6 + Tailwind 4 SPA for the habit tracker / daily diary / year resolutions / calendar. Currently plain JS, **migrating to TypeScript** and to a new design.

Communicate with the user in **German**. Code, identifiers, commit messages and docs in English.

**The project rules, the work plan and the API contract live in the backend repo** — read them there instead of guessing:

| What | Where |
|---|---|
| Project rules (learning project, git workflow, session hygiene) — they apply here too | `/Users/iseaman/RiderProjects/HannasHabits/CLAUDE.md` |
| Step-by-step plan (F0–F9) and the API contract per step | `/Users/iseaman/RiderProjects/HannasHabits/docs/ROADMAP.md` |
| Design language, tokens, screens, what the UI needs from the API | `/Users/iseaman/RiderProjects/HannasHabits/docs/DESIGN.md` |
| Progress log (append an entry per finished step) | `/Users/iseaman/RiderProjects/HannasHabits/docs/PROGRESS.md` |

Work on a frontend step from the backend repo's session (the roadmap, design and log live there) with this folder added as a working directory, or start here and open those files by path.

## Git workflow

- Work **only on branch `dev`**. Never commit to `main`. **Never push** and no force operations unless the user explicitly asks.
- Local commits are allowed once a roadmap step is finished and verified (`npm run build`, `npm run lint`, tests once they exist). Stage explicit paths, scan the staged diff for keys/tokens before committing, end commit messages with the `Co-Authored-By: Claude …` line the harness provides.

## Configuration & secrets

- `.env` (git-ignored) from `.env.example`: `VITE_API_URL` (backend base URL including `/api`), `VITE_GOOGLE_CLIENT_ID`. `VITE_*` values are inlined into the public bundle at build time — **never put secrets there**. The Google client *secret* is not used by the frontend at all; `client_secret*.json` is git-ignored and must never be committed.
- In Docker the two values are build arguments (`--build-arg`), not runtime variables.

## Commands

```bash
npm run dev       # http://localhost:5173 (the backend allows this origin via CORS)
npm run build
npm run lint
docker build --build-arg VITE_API_URL=… --build-arg VITE_GOOGLE_CLIENT_ID=… -t hannas-habits-ui .   # nginx on :8080, SPA fallback
```

The backend runs on `https://localhost:7054` (needs `dotnet dev-certs https --trust` once) or `http://localhost:8080` via docker compose.

## State of the code

The code in `src/` is the **old** UI: JSX, `console`-free since F0, three separate axios services with hard-coded old routes, auth data in `localStorage` keys, router `state` hacks. It is replaced step by step (F1 TypeScript, F2 design system, F3 skeleton + one API client, F4–F8 features). `npm run lint` is red on pre-existing findings of that old code (unused variables, missing hook deps); do not add new ones, and do not fix them one by one in code that a later step rewrites.

## Conventions to keep

- Dates are `yyyy-MM-dd` strings built with date-fns (`format`), never `toISOString()` (it is UTC and can be a day off). Send the client's local today as `asOf` / `startDate`.
- One shared axios client; the 401 → refresh → retry must be **single-flight** (a refresh token works exactly once; a second use revokes all sessions).
- Services throw; components decide what to show. No `console.*` left in committed code.
