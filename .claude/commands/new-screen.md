---
description: Build a screen from the design canvas
argument-hint: <canvas id, e.g. T6 or S3>
---

Build canvas screen **$ARGUMENTS**.

1. Find its route in `docs/routes.md` and its flow in `docs/PRD.md`.
2. Use only components from `src/components/ui/`; if one is missing, build it there first to the design-system rules in `docs/design-system.md`.
3. Put screen-specific pieces in `src/components/features/<area>/`; keep the page file thin.
4. All strings via `next-intl` — add keys to every file in `src/messages/`.
5. Logical CSS only (RTL), tokens only (both themes), 44px targets, focus ring.
6. Add `loading.tsx` / empty and error states (X2–X4).
7. Add a Playwright test covering the screen in Light, Dark, `en` and `ar`.
8. Run `ui-reviewer` before finishing.
