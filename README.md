# Hanna's Habits – Frontend 💻

The **frontend** of *Hanna's Habits*: a habit tracker with a daily diary, year resolutions and a calendar. A React single-page app in TypeScript that talks to one REST API.

🔗 **Backend repository**: [hannas-habits-server](https://github.com/iseaman89/hannas-habits-server)  
🔗 **Main project overview**: [hannas-habits](https://github.com/iseaman89/hannas-habits)

It is also a **learning project**; the plan, the design brief and the log of every step live in the backend repository's `docs/` folder (`ROADMAP.md`, `DESIGN.md`, `PROGRESS.md`).

---

## What it does

| Screen | Address | What you can do |
|---|---|---|
| Sign in / create account | `/login` | E-mail and password, or "Continue with Google" |
| Today / daily diary | `/diary/2026-10-08` (`/` goes to today) | One document per day with **autosave** (no save button): mood, body and mind sliders, highlight, "grateful for", "learned", tasks, and the day's habits |
| Habits | `/habits?month=2026-10` | Month tracker: tick a day, see the streak, add / edit / delete habits |
| Calendar | `/calendar?year=2026` | The year at a glance, every day with an entry in the colour of its mood; click a day to open it |
| Resolutions | `/resolutions?year=2026` | A numbered list per year; mark kept, edit, delete, link a resolution to a habit |

Light and dark theme (follows the system until you choose), keyboard-friendly (skip link, one tab stop per calendar month with arrow keys), a layout for phones (top bar + bottom navigation).

## Stack

React 18 · TypeScript (strict) · Vite 6 · Tailwind CSS 4 (design tokens in `src/shared/ui/theme.css`) · React Router 7 · TanStack Query · React Hook Form + zod · Axios (behind one typed call layer) · Lucide icons · Vitest + Testing Library.

The API types are **generated** from the backend's OpenAPI document (`src/shared/api/schema.d.ts`), so a changed endpoint breaks `npm run typecheck` instead of breaking at runtime.

---

## Run it for development

You need Node.js 22 and the backend running (see its README: `dotnet run` or `docker compose up`).

```bash
git clone https://github.com/iseaman89/hannas-habits-ui.git
cd hannas-habits-ui
cp .env.example .env     # then fill it in, see below
npm install
npm run dev              # http://localhost:5173
```

### Configuration

Two values, both **public** — Vite writes them into the bundle when it builds, so never put a secret here:

| Variable | Meaning |
|---|---|
| `VITE_API_URL` | Address of the backend **including `/api`**, e.g. `https://localhost:7054/api` (`dotnet run`) or `http://localhost:8080/api` (docker compose). A path such as `/api` works when the API sits behind the same server. |
| `VITE_GOOGLE_CLIENT_ID` | OAuth client id of the Google sign-in; the same value as the backend's `Google:ClientId`. Empty = no Google button, e-mail login only. `http://localhost:5173` must be an authorised JavaScript origin of that client. |

If `VITE_API_URL` is missing or is not a web address the app shows a page that says so instead of a blank screen.

Against `dotnet run` the browser must trust the ASP.NET development certificate (`dotnet dev-certs https --trust`, once); the backend redirects http to https.

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Type check (`tsc -b`) + production build into `dist/` |
| `npm run typecheck` / `npm run lint` / `npm run format:check` | TypeScript, ESLint (type-aware), Prettier |
| `npm test` | Unit and component tests (Vitest, jsdom, Testing Library; no mocking library — hand-written in-memory stand-ins in `src/test`) |
| `npm run api:types -- <openapi.json or URL>` | Regenerate `src/shared/api/schema.d.ts`, e.g. `-- http://localhost:8080/swagger/v1/swagger.json` |

---

## Run it in Docker

The image is the built app behind nginx (non-root, port 8080, SPA fallback, hashed assets cached for good, security headers, `/healthz`). The two settings are **build arguments** — they are fixed into the page when it is built, not read when the container starts:

```bash
docker build \
  --build-arg VITE_API_URL=http://localhost:8080/api \
  --build-arg VITE_GOOGLE_CLIENT_ID=<your client id> \
  -t hannas-habits-ui .
docker run --rm -p 8081:8080 hannas-habits-ui     # http://localhost:8081
```

The build fails at once when `VITE_API_URL` is empty. The backend has to allow the origin the page is served from: with its docker compose set `CORS_ORIGIN=http://localhost:8081` in its `.env`.

Not in the image on purpose: **HSTS** (TLS ends at the proxy in front of the container, which is where it belongs) and a full **Content-Security-Policy** (it would have to name the API origin, a build argument, and Google's sign-in scripts; a wrong one fails silently as a broken login). `nginx/security-headers.conf` sets the directives that cannot break anything.

## Project structure

```
src/app/                composition root: providers, the route table, the shell (sidebar / bottom navigation)
src/features/<name>/    auth · habits · diary · calendar · resolutions: screens, API calls, hooks, rules
src/shared/api/         the one API client and its generated types
src/shared/lib/         pure helpers (dates, theme, forms, ...)
src/shared/ui/          the design system (buttons, fields, dialog, skeleton, ...)
src/test/               stand-ins for the network and the session, used by the tests
nginx/                  production web server configuration
```

Dependencies point inwards: `app` → `features` → `shared`; a feature never imports another one's internals.

## Security notes

- The access token lives in memory; the **refresh token is in `localStorage`** (so a reload keeps you signed in), which means a script that runs on the page could read it. It rotates on every use and the backend revokes all sessions when an old one is replayed. The alternative — an HttpOnly cookie — needs backend changes and CSRF protection.
- Never commit `.env` or a Google `client_secret*.json` (both are git-ignored). The frontend does not use the client *secret* at all.

---

## 🧑‍💻 Author

**Yevgen Panych** – Umschüler zum Fachinformatiker AE  

📫 [LinkedIn](https://www.linkedin.com/in/yevgen-panych)  
