# CourseCapture

Teachers turn papers and slides into interactive courses; students join a class with a code and learn through modules, flashcards, quizzes and an AI tutor.

> **Status:** Stage 2 (accounts) — sign-in with email link or Google, teacher/student roles, teacher approval, invite codes and admin pages, on top of stage 1's tokens, themes and languages. The foundation preview moved to `/design`. Next stages: `docs/PRD.md` §9.

## Start here
| Read | For |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | What we're building and why |
| [`docs/architecture.md`](docs/architecture.md) | Stack and how the pieces connect |
| [`docs/folder-structure.md`](docs/folder-structure.md) | Where code goes |
| [`docs/schema.md`](docs/schema.md) | Database tables and security rules |
| [`docs/routes.md`](docs/routes.md) | Every design screen → its URL |
| [`docs/auth-and-roles.md`](docs/auth-and-roles.md) · [`docs/setup-supabase.md`](docs/setup-supabase.md) | Sign-in, roles, approval, invite codes; Supabase setup |
| [`docs/design-system.md`](docs/design-system.md) · [`docs/theming.md`](docs/theming.md) | Look, tokens, light/dark |
| [`docs/i18n.md`](docs/i18n.md) | Languages and right-to-left |
| [`docs/ai.md`](docs/ai.md) · [`ai/prompts/`](ai/prompts) | AI features and prompts |
| [`docs/decisions.md`](docs/decisions.md) | Decisions made and open questions |
| [`CLAUDE.md`](CLAUDE.md) | Rules for AI coding assistants |

## Stack
Next.js · TypeScript · Tailwind · Radix UI · Supabase · AI provider (Anthropic, OpenAI, Google…) · Inngest · next-intl · Vercel

## Setup
1. Install Node 20+ and pnpm (`corepack enable`).
2. `pnpm install`
3. `pnpm dev` and open `http://localhost:3000` — you'll be sent to `/en` (or your browser's language).
4. Before a PR: `pnpm check`.

Sign-in needs Supabase: follow [`docs/setup-supabase.md`](docs/setup-supabase.md) (hosted project, or `pnpm db:start` with Docker).

Recommended VS Code extensions: ESLint, Prettier, Tailwind CSS IntelliSense, i18n Ally, Supabase.
