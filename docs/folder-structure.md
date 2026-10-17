# Folder structure

```
coursecapture/
├── CLAUDE.md                     # Instructions for Claude Code working in this repo
├── AGENTS.md                     # Same rules for other AI coding tools (points to CLAUDE.md)
├── README.md                     # Setup and how to run
│
├── .claude/
│   ├── commands/                 # Slash commands for repeat tasks (new screen, migration, translation…)
│   └── agents/                   # Reviewer sub-agents (UI/accessibility, schema/RLS, i18n)
│
├── ai/
│   └── prompts/                  # Every prompt sent to the AI provider, as reviewed text files
│
├── docs/
│   ├── PRD.md                    # What we're building and why
│   ├── architecture.md           # Stack, data flow, environments
│   ├── folder-structure.md       # This file
│   ├── schema.md                 # Tables, relations, RLS rules
│   ├── routes.md                 # Every screen on the canvas → its URL
│   ├── auth-and-roles.md         # Sign-in, roles, approval, invite codes
│   ├── design-system.md          # How the CourseCapture design system maps to code
│   ├── theming.md                # Light / dark / system
│   ├── i18n.md                   # Languages, RTL, message files
│   ├── ai.md                     # Models, limits, safety, caching
│   └── decisions.md              # Decision log + open questions
│
├── design-system/                # Synced copy of the CourseCapture design system (tokens.json, logo SVGs)
│
├── src/
│   ├── app/
│   │   ├── [locale]/             # Every page lives under a locale: /en/…, /ar/…
│   │   │   ├── (auth)/           # sign-in, check-email, role, pending, invite, wrong-account
│   │   │   ├── (teacher)/teacher/  # classes, courses, roster, settings
│   │   │   ├── (student)/student/  # join, home, classes, courses, modules, finish
│   │   │   └── (admin)/admin/    # pending teachers, invite codes
│   │   └── api/                  # Route handlers: inngest, export, tutor (streaming)
│   │
│   ├── components/
│   │   ├── ui/                   # Design-system components (Button, Card, Stepper, DatePicker…)
│   │   ├── features/             # Screen-level pieces grouped by area
│   │   │   ├── auth/
│   │   │   ├── classes/
│   │   │   ├── courses/
│   │   │   ├── builder/
│   │   │   ├── player/
│   │   │   └── tutor/
│   │   └── layout/               # AppHeader, TabBar, Sidebar, page shells
│   │
│   ├── lib/
│   │   ├── supabase/             # Browser, server and service-role clients
│   │   ├── ai/                   # Provider-agnostic AI client (adapters per provider), prompt loader, output schemas
│   │   │   └── providers/        # One adapter per AI vendor (anthropic, openai, google, openai-compatible)
│   │   ├── parse/                # PDF, PPTX, text extraction + chunking
│   │   ├── svg/                  # SVG sanitiser
│   │   ├── auth/                 # Session + role guards
│   │   └── utils/
│   │
│   ├── i18n/                     # next-intl config, locale list, RTL helper
│   ├── messages/                 # UI strings: en.json, ar.json, fr.json, es.json
│   ├── styles/                   # globals.css, tokens.css (generated from design-system/)
│   ├── jobs/                     # Inngest functions (course generation)
│   └── types/                    # Shared types, generated Supabase types
│
├── supabase/
│   ├── migrations/               # SQL: tables, RLS policies, functions
│   ├── seed/                     # Demo teacher, class, course for local dev
│   └── tests/                    # RLS policy tests
│
├── public/                       # Icons, PWA manifest, favicon (from design-system/)
│
└── tests/
    ├── unit/
    ├── e2e/                      # Playwright: teacher flow, student flow
    └── a11y/                     # axe checks per screen, both themes, LTR + RTL
```

## Rules of thumb
- **Pages are thin.** A file in `app/` fetches data and composes `features/` components. No business logic in pages.
- **`ui/` knows nothing about CourseCapture data.** It only takes props. `features/` knows the data.
- **Server-only code** (`lib/ai`, service-role client, `jobs/`) imports `server-only` so it can never be bundled for the browser.
- **One source of truth** for colours, type and spacing: `design-system/tokens.json` → generated `styles/tokens.css` → Tailwind theme.
- **Every string a user sees** comes from `messages/`.
