# Architecture

## Stack

| Layer | Choice | Replaces (claude.ai artifact) |
|---|---|---|
| App + hosting | Next.js (App Router) + TypeScript + Tailwind CSS, on Vercel | The single HTML file |
| UI primitives | Radix UI, restyled with CourseCapture tokens | Hand-written CSS |
| Login | Supabase Auth — email magic link, Google (SSO later) | `claude.use('user')` |
| Data | Supabase Postgres with row-level security (RLS) | `claude.use('db')` |
| Files | Supabase Storage (`sources` bucket, private) | In-browser only |
| AI | Provider-agnostic AI layer (Vercel AI SDK): Anthropic by default, OpenAI, Google or others by config; server only | `sample()` / `sample.json()` |
| Long jobs | Inngest (alternative: Supabase Edge Functions) | Generation inside the open tab |
| i18n | `next-intl` with locale-prefixed routes | — |
| Themes | CSS variables from design tokens + `data-theme` on `<html>` | Inline `:root` variables |
| Phones | PWA first; Capacitor or Expo later | Opens only in claude.ai |
| Testing | Vitest (unit), Playwright (end-to-end), axe (accessibility) | — |

## How the pieces connect

```
Browser / PWA
   │ HTTPS
   ▼
Next.js on Vercel
   ├── Pages (React Server Components + client islands)
   ├── Server Actions / Route Handlers ── session check ──► Supabase (as the user, RLS)
   │                                   └─ only place with AI_API_KEY ──► AI provider
   └── Inngest functions (course generation) ──► Supabase (service role) + AI provider
```

Rules:
1. The browser talks only to the Next.js app (and Supabase Auth for sign-in).
2. Reads and writes for a user go through Supabase **as that user**, so RLS enforces access.
3. The **service-role key** is used only inside background jobs and admin actions, never in a request that a user's input can steer without a role check first.
4. The AI provider key lives only in server environment variables.

## Installable app and offline reading (#37)
- **Install:** `src/app/manifest.ts` (name, colours from the tokens, the design system's icons) plus the icon and Apple tags in the root layout. Browsers show their own install prompt; there's no custom button, because `beforeinstallprompt` doesn't exist on iOS.
- **Service worker** (`public/sw.js`, registered by `OfflineIdentity` in production, or in dev with `NEXT_PUBLIC_SW=1`). It's served with `no-store`, so updates arrive promptly. It handles three kinds of request:
  - **Student course, module and quick-check pages:** network first. A copy is saved whenever one loads, and the copy is used only when the network fails.
  - **The app's static files** (`/_next/static`, fonts, icons): network first, with the saved copy as fallback, so a saved page renders and its flashcards work offline.
  - **Every other navigation:** the network, or `/[locale]/offline` when there's none.

  It never saves teacher or admin pages, `/api` or `/auth` requests, or anything that isn't a GET.
- **Privacy:** saved pages belong to one person. Signed-in shells tell the worker who is signed in, and the sign-in page tells it nobody is. When that changes, the saved pages are deleted.
- **Offline notice:** a "You're offline" line on signed-in screens: students are told their opened modules can still be read, and teachers and admins to reconnect. It's rendered on the server and shown by a tiny inline script (`data-offline` on `<html>`), so it works on a saved page even before React loads. The live region is always in the page, so the change is announced. Answering a quick check or completing a module still needs the network; those actions show their usual "couldn't save" error.

## Request trace: a teacher builds a course
1. Teacher uploads a file on T1 → Server Action stores it in the private `sources` bucket and creates a `courses` row (`status = draft`) and a `generation_jobs` row.
2. The action checks the session and that the user is an **approved teacher** who owns the target class.
3. It sends an Inngest event `course/generate.requested`; the browser moves to T2.
4. The job extracts text (PDF text layer → vision transcription if scanned; PPTX via XML), chunks it, calls the AI provider per chunk, sanitises every SVG, and writes `modules` rows. It updates `generation_jobs.step` as it goes.
5. T2 subscribes to the job row (Supabase Realtime) and shows the step.
6. On finish → T3 Review. On failure → error on T2 with Retry; fallback splitter if the API is down.

## Environments
| | Local | Preview | Production |
|---|---|---|---|
| App | `next dev` | Vercel preview per PR | Vercel production |
| Supabase | Supabase CLI (local Docker) | Shared staging project | Production project |
| Inngest | Inngest dev server | Inngest branch env | Inngest production |

## Environment variables (names only)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY        # server only
AI_PROVIDER                      # anthropic | openai | google | … (default anthropic)
AI_API_KEY                       # server only — key for AI_PROVIDER
AI_BASE_URL                      # optional: OpenAI-compatible gateway or self-hosted endpoint
AI_MODEL_DEFAULT                 # course generation, diagrams, transcription (needs vision)
AI_MODEL_QUICK                   # Ask Claude tutor
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY
NEXT_PUBLIC_APP_URL
```
