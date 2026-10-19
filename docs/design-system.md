# Design system → code

The app uses the **CourseCapture design system** (Claude Design). Its look: calm, Apple-inspired — system fonts, cool neutrals, soft rounded cards and one blue accent.

## Source of truth
1. `design-system/` — a synced copy of the design system: `tokens.json`, `components/bundle.css`, and every component's `README.md` and `preview.html`. Never edited by hand; refresh with the `/sync-design-system` command.
2. `pnpm tokens` (`scripts/build-tokens.mjs`, also run before `dev` and `build`) generates:
   - `src/styles/generated/tokens.css` — every token as a CSS variable (`--surface`, `--space-5`, `--text-headline`…) for Light, Dark and System, the type classes (`.large-title`, `.headline`, `.body`…), and a Tailwind 4 `@theme` block that **replaces Tailwind's default palette, radii and text sizes** with the tokens. So `bg-surface`, `text-ink-muted`, `border-line`, `rounded-lg`, `shadow-card` exist and `bg-red-500` doesn't.
   - `src/styles/generated/components.css` — the system's component classes (`cc-btn`, `cc-badge`, `cc-card`…) with left/right rules rewritten to logical properties for RTL.
3. React components in `src/components/ui/` are thin, typed wrappers that apply those `cc-*` classes, so they look exactly like the design system and update when it changes.
4. Page layout uses Tailwind utilities on the 4px scale (`p-5` = 20px = `space-5`) and token colours only — **no hex values, no arbitrary colours**.
5. Shorthand rules that can't be converted for RTL are fixed by hand in `src/styles/rtl.css`.
6. All design-system CSS is in Tailwind's `components` layer, so a utility on a `cc-*` element (`p-4`, `font-semibold`, `max-sm:hidden`) overrides the component default.
7. Pieces drawn on the canvas but not yet in the system get CSS in `src/styles/extensions.css` (from tokens), to be proposed back to the system. The public site's pieces (Cover bands, display type, phone and window frames) are in `src/styles/marketing.css`.

## Tokens
| Group | Tokens |
|---|---|
| Colour | `bg`, `surface`, `surface-sunken`, `ink`, `ink-muted`, `line`, `line-strong`, `accent`, `on-accent`, `accent-text`, `accent-soft`, `success`, `warning`, `danger` (each has Light + Dark) |
| Type | `large-title`, `title`, `headline`, `body`, `callout`, `subhead`, `footnote`, `caption`, `eyebrow`, `code`, `join-code` — system font stack |
| Spacing | `space-1` (4) · 2 (8) · 3 (12) · 4 (16) · 5 (20) · 6 (24) · 8 (32) · 12 (48) |
| Radius | `radius-sm` 8 · `radius-md` 12 · `radius-lg` 20 · `radius-pill` |
| Shadow | `shadow-card` (Light only; Dark uses a `line` border) |
| Size | `control-height` 44 · `control-height-sm` 32 · `avatar` 28 |

## Rules carried over from the system
- One filled `accent` action per view; links and ghost buttons use `accent-text`.
- `ink-muted` never on `surface-sunken`.
- Status colours are for text and borders only, always with a word ("Correct", "Overdue").
- `line` for decoration, `line-strong` for borders that identify a control.
- Focus: 2px solid `accent` ring, 2px offset, on every focusable element.
- Motion: 120ms ease for hover/press, 400ms ease for progress width; honour reduced motion.
- No gradients, no coloured left borders, no decorative emoji.
- Icons: 24px grid, 1.8px stroke, round caps, `currentColor`; icon-only buttons need `aria-label`.
- Controls that are temporarily off (saving, nothing picked yet, first/last card) use `aria-disabled="true"` rather than `disabled`, so focus stays on them; styles in `src/styles/extensions.css`.
- AI diagrams: the sanitiser turns fixed white/black fills and strokes into `none`/`currentColor` so they work in both themes.
- Exception: the certificate PDF (`certificatePdf.ts`) can't read CSS tokens, so it uses RGB values that mirror `accent`, `ink` and `ink-muted` in Light.

## Components (`src/components/ui/`)
From the system (37): Button, IconButton, Menu, ThemeSwitcher · Field, Input, SearchInput, Select, Checkbox, Radio, Toggle, Switch, FileDropzone · Pagination, Breadcrumbs, Tabs · Badge, QuizOption, Toast, EmptyState, Skeleton, StatusDot, Tooltip, Modal, Sheet, DestructiveActionModal · CourseCard, ModuleNav, Flashcard, Book, Table, StudentRow · JoinCode, Announcement, StatTile · AppHeader, Avatar, Entity.

**Sketched on the canvas, not yet in the system** — built here, then proposed back to the system:
| Component | Used on |
|---|---|
| Stepper | T1–T3 — built as `Steps` (`src/components/ui/Steps.tsx`) |
| DatePicker | T5 — the native date input styled as `cc-input` for now (decision #63) |
| ClassPicker (Combobox) | T5 — a checkbox list with a due date per class instead (decision #64) |
| DiagramFrame (AI label, caption, alt text) | T4, S3 |
| AskClaudePanel (Sheet + input + answer cards) | S5 |
| TabBar (phone, 3 tabs, 52px targets) | T6, S2 and all phone screens |
| Large wordmark | T7, X6 |

**Phones (#61).** Rules the screens follow:
- Every control is at least 44px to tap. On touch screens (`pointer: coarse`) icon buttons, theme options and segmented options grow to 44px; with a mouse they keep the drawn sizes, so desktop matches the canvas (decision #72).
- Input text is at least 16px.
- Nothing scrolls sideways. A page grid starts as `grid-cols-1` (`minmax(0,1fr)`), so a wide child (the modules row that scrolls on its own below 640px) can't stretch the page.
- Long dialogs use `Dialog sticky`: the title stays at the top, the body scrolls, and the buttons stay at the bottom. Below 480px, dialogs become bottom sheets.
- Sticky action bars (`.cc-actionbar`) sit above the TabBar on phones.
- Card titles wrap to two lines rather than being cut to one.
- `tests/e2e/phone.spec.ts` checks all of this on every screen.

## Logo and icons
Use the system's `lockup.svg` / `lockup-dark.svg`, `mark*.svg`, `app-icon.svg`, `icon-192/512.png`, `icon-maskable-512.png`, `favicon.svg`. Fetched from the design system's assets into `design-system/assets/`; the app icons are copied into `public/` (#37). Don't recolour, stretch or retype.

## Keeping in sync
When the design system changes: re-sync `design-system/`, regenerate `tokens.css`, run the visual and a11y tests in both themes.
