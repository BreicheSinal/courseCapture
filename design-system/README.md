CourseCapture is a classroom web app where teachers turn papers and slides into interactive courses and students work through them. The look is calm and Apple-inspired: system fonts, cool neutrals, soft rounded cards and one blue accent. It is inspired by Apple's Human Interface Guidelines; no Apple fonts, icons or logos are bundled.

## Content fundamentals

- Write plain sentence-case copy. Name the action on every button: "Assign to Biology", "Post announcement", "Join", "Continue".
- Address the reader as "you" and say what to do next in errors and empty states. Real copy from the app: "No class with that code." and "Nothing assigned yet. Ask your teacher for a join code."
- Teacher screens use task words (Create class, New course, Post announcement). Student screens use progress words (Complete & next, Finish).
- Never use emoji as decoration. Status always carries a word: Overdue, Correct, Complete.
- Show progress as "3/9", quiz results as "quiz 80%" and dates as "Nov 4". Use tabular numerals where numbers line up.

## Visual foundations

- **Surfaces.** Put the page on `bg`, cards, panels and inputs on `surface`, and wells such as progress tracks on `surface-sunken`.
- **Text.** Set body text in `ink`. Use `ink-muted` for secondary text on `bg` or `surface` only, never on `surface-sunken`.
- **Accent.** Fill the one main action per view with `accent` and set its label in `on-accent`. Use `accent-text` for links and ghost buttons, and `accent-soft` with `accent-text` for selected and info states.
- **Status.** Use `success`, `warning` and `danger` for text and borders only, and always add a word or mark. Do not rely on color alone.
- **Borders.** Use `line` for decorative hairlines and `line-strong` for any border that identifies a control.
- **Type.** Use `large-title` once per page, `title` for sections, `headline` for card and module titles, `body` for explanations, `callout` for questions and announcements, `subhead` for meta lines, `caption` for dates, `eyebrow` for uppercase labels and `join-code` for the class code. The font is the system stack, which renders as SF Pro on Apple devices.
- **Spacing.** Step in 4px units from `space-1` to `space-12`. Pad cards with `space-5`, stack items inside a card with `space-3`, and keep a `space-4` page gutter.
- **Radius.** Use `radius-md` for controls, `radius-lg` for cards, `radius-pill` for badges, progress bars and avatars, and `radius-sm` for small chips and icon buttons.
- **Depth.** Give cards `shadow-card` in Light and a `line` border in Dark. Do not add gradients or colored left borders.
- **Controls.** Make buttons and inputs at least `control-height` tall, or `control-height-sm` in dense lists such as the roster.
- **Focus.** Draw a 2px solid `accent` ring with a 2px offset on every focusable element.
- **Motion.** Use 120ms ease for hover and press, and 400ms ease for progress width. Add nothing else, and honor reduced motion.
- **Themes.** Every color has a Light and a Dark value. Always reference tokens, never literal colors.

## Iconography

Icons are stroke icons on a 24px grid, 1.8px stroke, round caps and joins, drawn in `currentColor` and shown at 17px inside a 32px bordered IconButton (28px in compact lists). The app uses eye, trash, copy and refresh. No icon files are bundled. Give every icon-only button an `aria-label`.

## Logo

The mark is a rounded square with a viewfinder frame around three lines of text: a page being captured and turned into a course's modules. It is drawn as plain geometry, and the wordmark is "CourseCapture" in a bold sans with "Capture" in the accent color. The wordmark is outlined from Inter (an open-licensed face), so it looks the same everywhere; the app's own text still uses the system font.

- **Which file.** Use `lockup.svg` (mark and wordmark) on `bg` and `surface` in Light, and `lockup-dark.svg` in Dark. Use `mark.svg` and `mark-dark.svg` where only the symbol fits, such as an avatar or a list tile, and `wordmark.svg` or `wordmark-dark.svg` next to a mark that is already on screen.
- **One color.** `mark-ink.svg` and `mark-white.svg` have no square, for a single-color print or a photo background. Do not recolor the others.
- **Space and size.** Keep clear space of half the mark's height on every side. Do not show the mark smaller than 16px or the lockup smaller than 96px wide.
- **App icons.** `app-icon.svg` is the full-bleed square for iOS and the home screen; `icon-maskable-512.png` keeps the symbol inside the safe zone for Android; `favicon.svg`, `icon-192.png` and `icon-512.png` cover browsers and the PWA manifest.
- **Do not** stretch, rotate, add shadows or gradients, put the blue mark on a blue background, or retype the wordmark in another font.

## Components

Thirty-seven components cover the app today, each with guidelines in its own folder.

- **Actions:** Button, IconButton, Menu, ThemeSwitcher.
- **Forms:** Field, Input, SearchInput, Select, Checkbox, Radio, Toggle, Switch, FileDropzone.
- **Navigation:** Pagination, Breadcrumbs, Tabs.
- **Status and feedback:** Badge, QuizOption, Toast, EmptyState, Skeleton, StatusDot, Tooltip, Modal, Sheet, DestructiveActionModal.
- **Course:** CourseCard, ModuleNav, Flashcard, Book, Table (with the class roster).
- **Class:** JoinCode, Announcement, StatTile.
- **Layout and people:** AppHeader, Avatar, Entity.

Style them with `components/bundle.css` and the tokens.

---

## Consuming this system (generated — do not edit)

Every path named below is under `project/` in this design system: read `project/api/tokens.md`, not `api/tokens.md`.

7 components are documented without a runnable `components/bundle.js`: read each component’s card, and its README where it has one (`components/<Comp>/README.md`), and build to those guidelines. Tokens: the values are on `api/tokens.md`; a Slides deck or Design canvas also takes `tokens.json` by file path.

**Read, per thing:** a component’s props, parts and examples: `api/components/<Comp>.md`; token values: `api/tokens.md`. After this README, fetch the cards and fonts you need in ONE message as parallel calls — none depends on another.

**Two rules.** Before you use a thing — a component, a token group, an icon, an asset — read its card from the index below; a value you did not read from a card is a guess. `tokens.json`, `manifest.json` and `design-system.json` are sources for tools: hand them over. `components/<Comp>/README.md` is the long-form second read a card links to; `SKILL.md` and `artifact-type/` beside them are authoring guidance, not needed to consume the system.

## Index (generated — do not edit)

**Tokens**

- `api/tokens.md` — Every token: surface, text, fill, palette, type, spacing, radius, shadow, size. (6.8k)

**Components** (`api/components/<Comp>.md`, 7)

- **Class**: `Announcement` — Announcement is a short teacher post shown to every student in a class, newest first · `JoinCode` — JoinCode shows a class's five-character join code in a tinted bar with Copy and New code actions
- **Status**: `Badge` — Badge is a small uppercase pill that labels a role, a class or a status
- **Actions**: `Button` — Button is the single control for every action, in four styles and two sizes
- **Course**: `CourseCard` — CourseCard is the tappable card a student uses to open an assigned course, with its class, due date and progress · `StudentRow` — StudentRow is one line of the teacher's roster: avatar and name, a progress bar, modules done and the quiz score
- **Feedback**: `QuizOption` — QuizOption is one answer choice in a module's quick check; it shows the result after the student answers
