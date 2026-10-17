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

## Open questions
1. **Due date per class** when one course is assigned to several classes — assumed yes.
2. **Editing a course after it's assigned** — allowed? Assumed yes; changed modules keep students' progress on the unchanged ones.
