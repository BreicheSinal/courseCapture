---
description: Add a database migration with RLS and tests
argument-hint: <short description>
---

Create a migration for: **$ARGUMENTS**.

1. Read `docs/schema.md`. New file in `supabase/migrations/` named `<timestamp>_<snake_case>.sql` — never edit applied migrations.
2. Enable RLS on any new table; write policies matching the plain-language table in `docs/schema.md`.
3. Add or update policy tests in `supabase/tests/`.
4. Regenerate types into `src/types/supabase.ts`.
5. Update `docs/schema.md` in the same change.
6. Run `schema-reviewer`.
