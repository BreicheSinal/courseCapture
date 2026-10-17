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

## Open questions
1. ~~Who is the first admin?~~ Decided (#19): set in SQL.
2. **Approval emails** — Supabase's built-in mail or a provider like Resend?
3. ~~Package manager~~ Decided: pnpm.
4. ~~Repo visibility~~ Decided: private.
5. **Keep source files** after generation by default? Assumed: no.
6. **Quiz answer secrecy** — is it OK for v1 that a determined student could read answers? (See schema note.)
7. **Daily AI limits** — starting numbers per teacher and per student.
8. **Can a course be assigned to several classes**, or duplicated per class? Assumed: duplicated.
9. **Certificate** — on-screen + print only, or a downloadable PDF?
10. **Analytics** — Vercel Analytics, PostHog, or none for v1?
