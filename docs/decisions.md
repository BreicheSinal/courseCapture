# Decisions

## Decision log
| # | Decision | Why |
|---|---|---|
| 1 | Next.js + Supabase + AI provider on Vercel | Agreed stack (see "CourseCapture Stack" page) |
| 2 | CourseCapture design system for all UI | Matches the design canvas; one source of tokens |
| 3 | One responsive page per screen; themes via tokens | Canvas has phone/desktop and light/dark versions of the same screens |
| 4 | Drafts are a course `status`, not a separate table | Simpler queries; one editing path |
| 5 | Modules in their own table | Per-module progress, reordering and editing |
| 6 | Only first quiz attempt counts | Matches the current app |
| 7 | Keep email check, pending approval and invite-code screens | Needed for standalone accounts |
| 8 | Admin role approves teachers; invite codes skip approval | Prevents anyone becoming a teacher |
| 9 | Interface language ≠ course content language | A course can be in French in an English UI |
| 10 | Arabic RTL supported from day one | Far cheaper than retrofitting |
| 11 | Inngest for background generation | Step retries, local dev server, works on Vercel |
| 12 | Prompts stored as files in `ai/prompts/` | Reviewable, versioned |
| 13 | PWA first, native later | Fastest path to phones |
| 14 | Build in stages, one PR per stage | Reviewable chunks |
| 15 | Provider-agnostic AI layer (Vercel AI SDK), Anthropic by default | Switch vendor or model by env vars; no vendor lock-in |
| 16 | Role is picked on the sign-in screen and fixed once set | Matches the canvas (T7); the wrong-account screen (T7c) handles mix-ups |
| 17 | Names are asked on first sign-in (`/onboarding/profile`) | Email sign-in gives no name; T7d greets the teacher by name |
| 18 | Invite codes carry a school name and are 8 characters, 7-day default expiry | Matches T7e; no look-alike characters |
| 19 | First admin is set in SQL; admins can't be created from the app | Smallest attack surface |
| 20 | Design-system CSS sits in Tailwind's `components` layer | So utilities can override a component's defaults |
| 21 | Database tests run on plain Postgres with an auth shim | No Docker needed; same migrations as Supabase |
| 22 | A rejected teacher can still redeem an invite code | A code from the school admin is proof they teach there; T7d offers it |
| 23 | Only teachers who confirmed their email reach the approval queue | Asking for a link creates the account before anyone clicks it |
| 24 | Repo is public | No secrets in the repo; `.env.local` is never committed |
| 25 | Source files are deleted after generation; only the filename is kept | Privacy and storage cost |
| 26 | Quiz answers stay on the server; choices are checked by a database function | A student can't read answers from the browser |
| 27 | Daily AI limits: teacher 20 generations + 100 diagram redraws, student 30 tutor questions | Cost control; configurable by env |
| 28 | A course can be assigned to several classes (no copies), each with its own due date | One course to edit; progress stays per student per course |
| 29 | Certificates are downloadable PDFs | Requested |
| 30 | Analytics: Vercel Web Analytics (free, cookieless) | No consent banner needed |
| 31 | Students of any age sign up the same way; no parental-consent step | Owner's decision (#42). Revisit before launching to schools in regions with child-privacy rules (COPPA, GDPR-K) |
| 32 | Production: Vercel project `invix-studio/course-capture` at `https://invixlab.tech` | Domain already connected (#38) |
| 33 | Email: Supabase sends through Google SMTP as the support address; the app sends the approval email the same way | Owner's choice (#14); built-in mailer is test-only |
| 34 | Email link is the only sign-in method; the canvas's "Continue with school account" (Google) button is removed | Owner's choice; one path to support. Can come back later with the Google setup steps |
| 35 | Sign-in emails link with a token hash, verified on the server | Teachers ask on a laptop and open the email on a phone; PKCE-only links fail there |
| 36 | Approval email sent by the app with nodemailer over the same SMTP account, after the response | One sender for all mail; a slow mail server never delays the admin |
| 37 | Class sections are links with their own URLs (Courses · Roster · Announcements), styled as tabs; the canvas's "Modules" tab is labelled "Courses" because it lists courses | Links keep refresh/back working; the label says what's there |
| 38 | Course tables arrive in stage 3, read-only to clients | T6, T11, T12 and T16 read them; stages 4–5 add the write paths without reshaping queries |
| 39 | Deleting a class keeps its courses (only the assignments go) | A course can be in several classes (#28); the canvas copy said courses were removed |
| 40 | Course levels are beginner / intermediate / advanced (PRD), not the canvas's school stages | Matches the PRD and T1; the level describes the course, not the school |
| 41 | Dates are formatted in UTC until profiles store a time zone | Server and client render the same text; due dates are calendar dates |
| 42 | "New course" opens a placeholder until stage 5 (done: replaced by T1 in stage 5) | Every button on the canvas leads somewhere honest |
| 43 | Deleting a class keeps students' progress on its courses | Progress belongs to the student and the course (#28); the course may be in other classes |
| 44 | Joining a class is limited to 10 wrong codes per student per hour | 5-character codes can otherwise be guessed |
| 45 | Teachers see students' name and email only (through the roster function), never the whole profile | Least data; the screens need nothing else |
| 46 | Certificates are made in the browser (jsPDF + Noto Sans / Noto Sans Arabic in `public/fonts`), not stored | Nothing to keep or secure on the server; Arabic and Latin names both render. Each fact gets its own line because PDF text can't mix directions well |
| 47 | The reader shows the module's explanation (body) above the key points | PRD S3 lists it; the canvas only showed key points |
| 48 | "Complete & next" on the quick check needs an answer first | The quick check is the module's last step; skipping it would leave the score empty |
| 49 | AI-drawn SVGs are cleaned with an allowlist (`sanitize-html`) when stored and again when shown | CLAUDE.md rule 6; defence in depth |
| 50 | "Ask about this module" (S5) is left off the reader until stage 6 | No button that does nothing |
| 51 | Without Inngest, the generation job runs right after the response (`after()`); with it, in Inngest steps | Previews and small sites work with no extra service; production gets per-step retries |
| 52 | The uploaded file is deleted when generation finishes, and kept after a failure until the teacher retries or the day's sweep | "Try again" shouldn't mean uploading again; nothing is stored longer than needed (#25) |
| 53 | Browsers upload straight to Storage through a signed URL for one path; there are no client storage policies | Files never pass through the app server (size limits), and no teacher can list or read any file, even their own |
| 54 | A generation counts toward the daily limit when it starts, including basic-splitter results; retries and diagrams drawn during it don't | Predictable for teachers ("n left today") and can't be gamed by failing on purpose |
| 55 | No API key → the basic splitter writes the course (no flashcards, quiz or diagrams) and T1 says so; scans need a model | The app stays usable before AI is set up (FR-13) |
| 56 | Assigning to one class returns to that class's page; to several, back to T3 with "Assigned to N classes" | The teacher lands where the course now shows up |
| 57 | The course's language defaults to the teacher's "default course language" (T14), not the interface language | A teacher may use the app in English and teach in Arabic, or the reverse |
| 58 | Teachers can edit a course after it's assigned; edits keep students' progress on unchanged modules, deleting a module removes its progress | Answers open question 2; fixing a mistake shouldn't mean starting over |
| 59 | HTML export is for the course's teacher only and includes the quiz answers (in a "Show the answer" fold), with no scripts | It's a hand-out the teacher shares as they choose; a static file stays safe to open anywhere |
| 60 | An `AI_PROVIDER=fake` adapter writes canned content; it can't run in production | Fast, free, repeatable tests of the whole flow |
| 61 | End-to-end tests run against a small Supabase stand-in (`tests/e2e/stack/`) on real Postgres with the real migrations | Docker isn't available everywhere; RLS still decides every read and write |
| 62 | Data-driven page titles stream with the page under Cache Components (as in stages 3–4) | `next build` accepts it (partial prerender); `next dev` prints an "instant navigation" hint for these routes, which isn't an error |
| 63 | T5 uses the browser's date input (styled as `cc-input`) rather than a custom DatePicker | Accessible, localised and right-to-left out of the box; a custom picker can be proposed to the system later |
| 64 | T5 lists classes as checkboxes, each with its own due date, rather than a ClassPicker combobox | Teachers have a handful of classes, and every chosen class needs its own date (#28) |
| 65 | AI review notes (`modules.review_note`) are hidden from students by column grants; teachers read them through `module_review_notes()` | A note like "option C may also be right" gives the answer away |
| 66 | An assigned course can't be regenerated (app and database) | A new run replaces every module, which would take students' progress |
| 67 | A generation job unfinished after 30 minutes counts as dead: T2 offers "Try again" and assigning isn't blocked | An inline run that hits the time limit would otherwise leave the course stuck |
| 68 | Teacher server actions use the service role for three things only, each after a session or RLS check: signed upload URLs and source files, `claim_ai_use()` / `add_ai_tokens()`, job rows, and the diagram a redraw produces (generated content is service-written) | These are service-only by design (#53, #54); the teacher's own reads and edits stay on their session and RLS |
| 69 | With `AI_PROVIDER` empty, the provider comes from the key's prefix, and every listed provider has default models | A key alone should work; the first real Google key was silently sent to Anthropic (#62) |
| 70 | A diagram with a caption but no `ALT:` line uses the caption as its alt text | The caption describes the diagram in the course's language; dropping the whole diagram helped no one |
| 71 | A refused AI key is shown on T3 (job `error = "ai_rejected"` on a finished job), not only logged | Teachers otherwise get a basic-splitter course with no idea why |
| 72 | On touch screens (`pointer: coarse`), icon buttons, theme options and segmented options grow to 44px; with a mouse they keep the design system's drawn sizes | 44px targets where fingers tap (CLAUDE.md rule 7) without changing the desktop canvas (#61) |
| 73 | On phones the module editor's sticky bar holds only "Mark as checked" and "Save changes"; "Preview as student" moves below the form | Three actions didn't fit in Arabic, and the second row hid under the TabBar |
| 74 | The classes search box is a `<label>`, so a tap anywhere in it focuses the field | The design system's input inside the box is only 20px tall |
| 75 | The service worker saves only student course, module and quick-check pages (network first), and deletes them on sign-out or when a different person signs in | Students can read on the bus; nothing private outlives the session, and teachers' screens are never stored on a device |
| 76 | A hand-written service worker (`public/sw.js`), not a library such as Serwist | About 100 lines covering three request types; no build plugin to keep in step with Next 16 and Turbopack |
| 77 | No custom "Install" button; browsers show their own prompt | `beforeinstallprompt` doesn't exist on iOS, and Next's guide advises against it |
| 78 | The offline notice is shown by an inline script, not React | A saved page may be opened before its scripts load; the notice must still appear |
| 79 | The manifest uses the Light `bg` for its colours, and has no description | A manifest can't use media queries; a one-language description would show in install dialogs. The page's per-scheme `theme-color` takes over once loaded |
| 80 | `/` is the public marketing page; the old dispatcher moved to `/app` | Sign-in links, the installed app (`start_url`) and the in-app wordmark go to `/app`. The manifest `id` stays `/`, so existing installs keep working (#58) |
| 81 | Marketing screens are real captures of the app, committed as WebP in both themes | `pnpm media:capture` seeds a sample course and screenshots it; `pnpm media` builds animated WebP (site) and GIFs (sharing). The page uses only two recordings and text, no screenshot gallery (owner's call: minimal and to the point). CSS shows the page's theme and the images are lazy, so only that theme downloads |
| 82 | The animations can be paused; with reduced motion they're a still | WCAG 2.2.2 for anything moving longer than five seconds; `<picture>` serves the poster for `prefers-reduced-motion` |
| 83 | Marketing copy says "AI", not a provider's name | The provider is configurable (Anthropic, Google, OpenAI, Mistral; `docs/ai.md`) |
| 84 | The contact form stores nothing about the message; its rate limit keeps an HMAC of the sender's IP (key `CONTACT_SALT`; IPv6 grouped by /64) and a time, 5 an hour, in `contact_attempts`. In production it fails closed without the service role, the salt or a client IP | Works across serverless instances without another service; rows older than a day are removed on the next claim. An exception to "service role only in jobs and admin code": anonymous visitors trigger one narrow function with a fixed-length hash (#59) |
| 85 | App pages send `noindex`; only `/`, `/privacy`, `/terms` and `/contact` opt in, and robots.txt disallows app paths | Search results show only the public site (#59) |
| 86 | One neutral social preview for every language: Cover bands, wordmark, two Light screens, no sentence | next/og can't shape Arabic reliably; each page's own title and description carry the language |
| 87 | Privacy and terms use the wording drafted from what the app does today, approved by the site owner on 2026-10-19; the "Draft" note is gone | The owner decides the legal text; the page shows "Last updated" from `UPDATED` in `LegalPage.tsx` (#59) |
| 88 | Marketing display type is the Cover's 64 / 0.95 on wide screens, scaled down to 40px on phones (`clamp`) | 64px headlines don't fit a 390px screen; no display token exists yet, so it's proposed back with the other marketing pieces |

## Open questions
1. **Due date per class** when one course is assigned to several classes — assumed yes.
2. ~~**Editing a course after it's assigned**~~ — decided: yes (#58).
