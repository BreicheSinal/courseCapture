# Proposals for the design system (#41)

Pieces drawn on the canvas, or needed by the app, that the CourseCapture design system doesn't have yet. Each one is built here from the system's tokens (`src/styles/extensions.css`, `src/styles/marketing.css`, `src/components/ui/`), so this page is the hand-over: what to add to the system, the rules it already follows in the app, and what to delete here once the system ships it.

Every proposal keeps the system's rules: tokens only, Light and Dark, logical properties (right to left works without extra CSS), a 2px `accent` focus ring with a 2px offset, 44px targets on touch, status with a word and not colour alone, 120ms ease for hover and press.

How to send them: start a design-system sync (`/design-sync`) and push one component at a time, each as a `components/<Name>/README.md` and `preview.html`, in the system's own format. After the next `/sync-design-system`, swap the app over to the system's class and delete the local CSS listed under **Remove here**.

| # | Component | Status in the app | Priority |
|---|---|---|---|
| 1 | [Stepper](#1-stepper) | Built as `Steps` | High: on every course-building screen |
| 2 | [TabBar](#2-tabbar) | Built in `layout/TabBar.tsx` | High: on every phone screen |
| 3 | [DiagramFrame](#3-diagramframe) | Markup repeated in three components | High: three copies to keep in step |
| 4 | [Large wordmark and display type](#4-large-wordmark-and-display-type) | `cc-wordmark--lg`, `cc-mk-display` | Medium |
| 5 | [AskClaudePanel](#5-askclaudepanel) | Not built yet (#36) | Medium: needed before #36 |
| 6 | [DatePicker](#6-datepicker) | Native date input (decision #63) | Low: propose the styled native input |
| 7 | [ClassPicker](#7-classpicker) | Checkbox list with dates (decision #64) | Low: propose the list, not a combobox |

---

## 1. Stepper
**Where:** T1 New course, T2 Generating, T3 Review, T5 Assign ("1 · Source, 2 · Generate, 3 · Review & assign").
**In the app:** `src/components/ui/Steps.tsx`, classes `cc-steps*` in `extensions.css`.

**Anatomy:** an ordered list; each step is a 4px bar (`radius-pill`) above a `caption` label "n · Name". Steps share the width equally with a `space-2` gap.

| State | Bar | Label |
|---|---|---|
| Upcoming | `line` | `ink-muted` |
| Done | `accent` | `ink` |
| Current | `accent` | `accent-text`, weight 600 |

**Accessibility:** `<ol>` with an `aria-label` naming the flow; the current step has `aria-current="step"`. The number is text and done/current differ in weight and colour, so state never depends on colour alone. Numbers are formatted with `Intl` (Arabic digits in Arabic).
**Right to left:** the grid flows from the start edge; nothing to mirror.
**Props:** `label`, `steps: string[]`, `current: number`.
**Remove here:** the `.cc-steps` block in `extensions.css`.

## 2. TabBar
**Where:** every signed-in screen below the `lg` breakpoint (T6, S2 and all phone artboards). Teacher: Classes · Courses · Settings. Student: Home · Classes · Account. Admin: Teachers · Invites.
**In the app:** `src/components/layout/TabBar.tsx`; `--tabbar-h` and `.cc-actionbar` in `extensions.css`.

**Anatomy:** fixed to the bottom, `surface` with a `line` top border, padded by `env(safe-area-inset-bottom)`. Two or three equal tabs, each a 22px icon over a `caption` label, at least 52px tall.

| State | Icon and label |
|---|---|
| Default | `ink-muted` |
| Current | `accent-text`, label weight 600 |
| Focus | system ring |

**Accessibility:** `<nav aria-label="Main">` with real links; the current tab has `aria-current="page"`. The label is always shown, so the icon never stands alone.
**Related token:** `--tabbar-h` (52px + 1px border), which sticky action bars use to sit above the bar. Proposed as a size token.
**Right to left:** the order follows the reading direction; icons don't mirror.
**Remove here:** `--tabbar-h` and the `.cc-actionbar` offset, once the system defines them.

## 3. DiagramFrame
**Where:** S3 Module reader, T4 Edit module (preview), teacher course preview.
**In the app:** the same markup in `Reader.tsx`, `CoursePreview.tsx` and `ModuleEditor.tsx`; `.cc-diagram` and `.cc-diagram--edit` in `extensions.css`.

**Anatomy:** a card holding a `<figure>`: the diagram well (`radius-md`, `line` border, `space-3` padding, text in `ink`, scrolls sideways if the drawing is wide) and a `<figcaption>` with the caption (`callout`) and an AI label (`caption`, `ink-muted`): "Diagram drawn by Claude, checked by your teacher".

| Variant | Well background |
|---|---|
| Reader | transparent (card shows through) |
| Edit | `surface` |

**Content rules:** the SVG is sanitised; fixed white and black become `none` and `currentColor`, so one drawing works in both themes. The SVG scales to the well (`max-width: 100%`, `height: auto`, centred).
**Accessibility:** the well has `role="img"` and an `aria-label` from the diagram's alt text (required; the caption is used when there's no alt, decision #70). Caption and alt carry the course's `lang`.
**Props:** `svg`, `alt`, `caption?`, `aiLabel`, `variant: "reader" | "edit"`, `lang`.
**Remove here:** `.cc-diagram*` in `extensions.css`; then one `ui/DiagramFrame.tsx` replaces the three copies.

## 4. Large wordmark and display type
**Wordmark, where:** T7 Sign in and X6 Splash. **In the app:** `.cc-wordmark--lg` (the wordmark set in `large-title`, letter-spacing -0.02em), always `dir="ltr"`.
**Proposal:** a `wordmark-lg` size in the Logo guidance, or a `lockup-lg` rule, so the large wordmark comes from the outlined asset rather than text. Keep the existing rules: no smaller than 96px wide, clear space of half the mark's height.

**Display type, where:** the public marketing page (decision #88). **In the app:** `.cc-mk-display` in `marketing.css`: bold, 64px on wide screens scaled to 40px on phones (`clamp(40px, 6.4vw, 64px)`), line height 0.95, letter-spacing -0.025em, `text-wrap: balance`. Arabic uses letter-spacing 0 and line height 1.2, since joined letters and taller marks need it.
**Proposal:** a `display` type token (with a phone size) next to `large-title`, plus the per-script override for Arabic.
**Remove here:** `.cc-wordmark--lg` in `extensions.css`; `.cc-mk-display` in `marketing.css`.

## 5. AskClaudePanel
**Where:** S5 Ask Claude, a sheet over S3 (`?ask=1`). Not built yet; this is the canvas spec, to agree before #36 is built.

**Anatomy:** the system's Sheet (bottom sheet on phones, side panel on desktop) with:
- a header: title "Ask about this module" and the module's heading as a `subhead`, plus a close IconButton;
- the conversation: the student's question as a right-aligned (end-aligned) `accent-soft` bubble, the answer as a `surface` card with an "Answer from Claude" `caption`;
- a note under the answers: answers can be wrong, check with your teacher;
- the composer at the bottom: a multi-line Input ("Ask a question") and a primary "Ask" button, with "n questions left today" as a `footnote`.

| State | What shows |
|---|---|
| Empty | three suggested questions as ghost buttons |
| Thinking | Skeleton lines in the answer card, `aria-busy` on it |
| Answered | the answer card |
| Limit reached | composer off (`aria-disabled`), notice "No questions left today. Try again tomorrow." |
| Error | warning notice with "Try again" |

**Accessibility:** focus moves into the sheet on open and back to the "Ask Claude" button on close; Escape closes; new answers are announced through a polite live region; the composer has a real `<label>`.
**Right to left:** bubbles align to the end edge, so they swap sides with the direction.
**Remove here:** nothing yet; build it from the system's version.

## 6. DatePicker
**Where:** T5 Assign, one due date per class.
**In the app:** the browser's date input with the `cc-input` class (decision #63): accessible, localised and right to left with no extra code.
**Proposal:** add the styled native input to the system as **DateInput** (same height, border, radius and focus as Input; the calendar icon in `ink-muted`; disabled state when its class isn't ticked), rather than a custom calendar. A custom popover picker would need a full keyboard grid, its own localisation and right-to-left handling, for little gain on phones, where the system's native picker is better.
**Remove here:** nothing; the app already uses `cc-input`.

## 7. ClassPicker
**Where:** T5 Assign.
**In the app:** a list of Checkboxes, one per class (name, section, student count), each with its own DateInput that's on only when the class is ticked (decision #64).
**Proposal:** add this pattern as **ClassPicker (list)**: rows of Checkbox + label + meta + trailing DateInput, separated by `line`, in a sticky Dialog. A combobox was drawn on the canvas, but teachers have a handful of classes and each needs its own date, which a combobox can't hold.
**Accessibility:** each row is a real `<label>`; the date's label names its class ("Due date for Biology 10").
**Remove here:** nothing; it's built from system components.

---

## Smaller pieces to mention with the batch
These are app CSS in `extensions.css` that the system could adopt as variants:
- **Notice** (`.cc-notice`, `.cc-notice--warning`): tinted info box and outlined warning box with a leading icon (T1–T3, offline banner).
- **Job list** (`.cc-joblist`): steps with a word and a mark per state (T2).
- **Link tabs** (`a.cc-tab[aria-current="page"]`) and **link cards** (`a.cc-course`): Tabs and CourseCard as links.
- **Large join code** (`.join-code--lg`, 34/41): T9 Class created.
- **`aria-disabled` styling** for Button, IconButton and QuizOption, so off controls keep focus.
- **Touch sizes** (decision #72): IconButton, ThemeSwitcher and Segmented options at 44px under `pointer: coarse`.
