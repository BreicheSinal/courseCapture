---
description: Add or update UI strings in every locale
argument-hint: <namespace or feature>
---

Update translations for **$ARGUMENTS**.

1. Add keys to `src/messages/en.json` first (source of truth), using ICU for plurals/variables.
2. Add the same keys to `ar.json`, `fr.json`, `es.json`. Mark machine translations for review in the PR description.
3. Follow the copy style in `CLAUDE.md` (sentence case, name the action).
4. Check RTL rendering of any changed screen in `ar`.
5. Run the missing-keys check.
