# CourseCapture

Teachers turn papers and slides into interactive courses; students join a class with a code and learn through modules, flashcards, quizzes and an AI tutor.

> **Status:** project structure and docs only — no app code yet. Review the docs, then the build starts in stages (see `docs/PRD.md` §9).

## Start here
| Read | For |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | What we're building and why |
| [`docs/architecture.md`](docs/architecture.md) | Stack and how the pieces connect |
| [`docs/folder-structure.md`](docs/folder-structure.md) | Where code goes |
| [`docs/schema.md`](docs/schema.md) | Database tables and security rules |
| [`docs/routes.md`](docs/routes.md) | Every design screen → its URL |
| [`docs/auth-and-roles.md`](docs/auth-and-roles.md) | Sign-in, roles, approval, invite codes |
| [`docs/design-system.md`](docs/design-system.md) · [`docs/theming.md`](docs/theming.md) | Look, tokens, light/dark |
| [`docs/i18n.md`](docs/i18n.md) | Languages and right-to-left |
| [`docs/ai.md`](docs/ai.md) · [`ai/prompts/`](ai/prompts) | AI features and prompts |
| [`docs/decisions.md`](docs/decisions.md) | Decisions made and open questions |
| [`CLAUDE.md`](CLAUDE.md) | Rules for AI coding assistants |

## Stack
Next.js · TypeScript · Tailwind · Radix UI · Supabase · AI provider (Anthropic, OpenAI, Google…) · Inngest · next-intl · Vercel

## Setup (once code lands)
1. Install Node 20+ and pnpm, Docker (for local Supabase).
2. `cp .env.example .env.local` and fill in the keys.
3. `pnpm install`, `pnpm db:start`, `pnpm dev`, `pnpm inngest:dev`.
4. Open `http://localhost:3000`.

Recommended VS Code extensions: ESLint, Prettier, Tailwind CSS IntelliSense, i18n Ally, Supabase.
