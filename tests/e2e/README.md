# End-to-end tests

Playwright drives the real app (`next dev`) against:

- **Real Postgres with every migration**, reset before each run (`stack/reset-db.mjs`, database `cc_e2e` next to `TEST_DATABASE_URL`). Row-level security decides every read and write, as in production.
- **A small Supabase stand-in** (`stack/supabase-standin.mjs`) on port 54321 that answers the Auth, REST, RPC and Storage calls this app makes. It is not Supabase; it exists because Docker (and so `supabase start`) isn't available everywhere. Requests run as their JWT's role with `request.jwt.claim.sub` set, like PostgREST.
- **The fake AI provider** (`AI_PROVIDER=fake`), so generation is fast, free and the same every run. Jobs run inline (no Inngest).

## Run
```
pnpm test:db                 # optional first: the database tests
pnpm test:e2e                # starts the stand-in and next dev on :3100, then runs tests/e2e/*.spec.ts
```
Needs Postgres at `TEST_DATABASE_URL` (default `postgres://postgres:postgres@localhost:5432/postgres`) and a Chromium. If Playwright can't download its browser, point it at one: `E2E_CHROME=/path/to/chrome pnpm test:e2e`. `E2E_PORT` and `E2E_DB` change the app port and database name.

## Writing tests
- `helpers.ts`: `createUser`, `createClass`, `signIn` (sets the session cookie), `sql` (as the superuser, for setup and checks), `asUser` (runs SQL as a signed-in user, so RLS applies), `expectAccessible` (axe, no violations).
- Each test makes its own users, so tests don't share state.
- Design-system checks and radios hide the real input: click the label, as people do.
- Pages stream, so a not-found page can arrive with HTTP 200: check what the page shows, not the status.
- `next dev` prints "encountered uncached data during prerendering or a navigation" for data-driven pages. That's a dev hint, not a failure (decision #62).
