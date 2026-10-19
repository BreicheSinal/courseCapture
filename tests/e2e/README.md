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
Two Playwright projects run:
- **chromium:** desktop.
- **phone:** 390×844 with touch. It runs the course-builder flows again, plus `phone.spec.ts`, which visits every screen in English (Light) and Arabic (Dark). That spec fails on sideways scrolling or zoom-out, controls under 44px, input text under 16px, or any axe violation (#61).

Use `--project=phone` for just the phone run.

`classroom.spec.ts` (#40) is the whole loop through the screens, in English (Light, left to right) and Arabic (Dark, right to left): a teacher creates a class, posts an announcement, builds and assigns a course; a student joins with the code (typed in lower case, with spaces), reads every module, answers each quick check and gets the certificate; the roster shows the score. Labels come from `src/messages/*.json` through next-intl's `createTranslator`, so an untranslated string fails the Arabic run, and every screen gets axe in its theme and direction.

`marketing.spec.ts` (#58, #59) covers `/` for a visitor, a teacher and a student, axe in Light, Dark and Arabic, the phone layout of the public pages, the contact form (validation, honeypot, failed send), the sitemap, robots.txt and the social preview.

A third project, **media**, only runs when asked: `pnpm media:capture` seeds a sample class and saves screenshots and animation frames to `tmp/media` (`MEDIA_OUT` to change it), then `pnpm media` turns them into `public/marketing/`. Run it against a production build on :3100 (`next build && next start --port 3100` with the stand-in env) for steady frames; `playwright.config.ts` reuses a server that's already running.

`pwa.spec.ts` (#37) tests the manifest and icons, offline reading, and deleting saved pages on sign-out, with the service worker on (`NEXT_PUBLIC_SW=1`). Playwright only routes service-worker requests with `PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS=1`, which `playwright.config.ts` sets, so the offline tests cut the network with `context.route()` as well as `setOffline()`.

Needs Postgres at `TEST_DATABASE_URL` (default `postgres://postgres:postgres@localhost:5432/postgres`) and a Chromium. If Playwright can't download its browser, point it at one: `E2E_CHROME=/path/to/chrome pnpm test:e2e`. `E2E_PORT` and `E2E_DB` change the app port and database name.

## In CI
`.github/workflows/ci.yml` runs on every pull request and push to `main`: `pnpm check` and `pnpm build`, `pnpm test:db`, and `pnpm test:e2e:ci` (the chromium and phone projects; not media) against a `postgres:16` service. No secrets are needed. In CI each test gets one retry (a cold `next dev` compile), failures are annotated on the PR, and traces and the HTML report are kept as the `playwright-results` artifact for a week.

## Writing tests
- `helpers.ts`: `expectPhoneFriendly` (the phone layout checks), `createUser`, `createClass`, `signIn` (sets the session cookie), `sql` (as the superuser, for setup and checks), `asUser` (runs SQL as a signed-in user, so RLS applies), `expectAccessible` (axe, no violations).
- Each test makes its own users, so tests don't share state.
- Design-system checks and radios hide the real input: click the label, as people do.
- Pages stream, so a not-found page can arrive with HTTP 200: check what the page shows, not the status.
- `next dev` prints "encountered uncached data during prerendering or a navigation" for data-driven pages. That's a dev hint, not a failure (decision #62).
