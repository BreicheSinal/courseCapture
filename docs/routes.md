# Routes — canvas screens to URLs

All routes are prefixed with the interface locale, e.g. `/en/teacher/classes`, `/ar/student/home`. One responsive page per screen covers both the phone and desktop artboards; light and dark come from the theme, not separate pages.

## Auth and onboarding
| Canvas | Route | Notes |
|---|---|---|
| X6 Splash | `/` while routing | Wordmark while `/` decides where to send you |
| T7 Sign in | `/sign-in?error=` | Teacher/student choice, email magic link |
| T7b / S0b Check your email | `/sign-in/check-email?role=` | Same page, role-specific copy |
| — Name (and role) | `/onboarding/profile?role=` | First sign-in only; role is normally picked on T7 |
| T7e Invite code | `/onboarding/invite` | Teacher with a code |
| T7d Pending approval | `/onboarding/pending` | Teachers waiting for admin |
| T7c Wrong account type | `/wrong-account` | Opened the other role's area |
| — | `/auth/callback` | Supabase redirect handler (no locale prefix) |
| — Foundation preview | `/design` | Dev page: tokens, components, themes |

## Teacher
| Canvas | Route |
|---|---|
| T8 First run | `/teacher/classes` when there are no classes (`/teacher` redirects there) |
| T10 Class list / Desktop sidebar | `/teacher/classes` |
| T9 Create class | `/teacher/classes/new` |
| T6 Class page | `/teacher/classes/[classId]` |
| T11 Roster | `/teacher/classes/[classId]/students` |
| T12 Student panel | `/teacher/classes/[classId]/students/[studentId]?course=` (dialog over the roster) |
| T13 New announcement | `/teacher/classes/[classId]/announcements` (form above the posted list, as on the canvas) |
| — Edit class | `/teacher/classes/[classId]/edit` (from the class page's settings list and T9 "Edit class name") |
| T15 Delete class | `/teacher/classes/[classId]/delete` (dialog over the class page) |
| T16 / Desktop T7 Courses | `/teacher/courses` |
| T1 New course | `/teacher/courses/new?class=` |
| T2 Generating | `/teacher/courses/[courseId]/generating` |
| T3 Review course | `/teacher/courses/[courseId]/review` |
| T4 Edit module | `/teacher/courses/[courseId]/modules/[position]/edit` |
| T5 Assign | `/teacher/courses/[courseId]/assign` |
| — Preview | `/teacher/courses/[courseId]/preview?module=` (student view, read-only, nothing recorded) |
| — Export as HTML | `GET /api/courses/[courseId]/export` (owning teacher; a download, includes the quiz answers) |
| T14 / Desktop T8 Settings | `/teacher/settings` |

## Student
| Canvas | Route |
|---|---|
| S1 Join | `/student/join` (and where `/student` sends a student with no classes) |
| S2 Home | `/student` |
| S7 / Desktop S7 Classes | `/student/classes` and `/student/classes/[classId]` |
| S8 Course overview | `/student/courses/[courseId]` |
| S3 Module reader | `/student/courses/[courseId]/modules/[position]` |
| S4 Quick check | `/student/courses/[courseId]/modules/[position]/check` |
| S5 Ask Claude | Sheet over S3 (`?ask=1`), not a separate page — stage 6 |
| S6 Finish | `/student/courses/[courseId]/finish` (only once every module is done; otherwise back to S8) |
| Desktop S8 Account | `/student/account` |

## Admin
| Route | Purpose |
|---|---|
| `/admin/teachers` | Pending teachers: approve / reject |
| `/admin/invites` | Create and revoke teacher invite codes |

*(No canvas screens yet — built from existing components.)*

## Shared
| Canvas | Where |
|---|---|
| X1 Account menu | Menu in AppHeader (theme, language, settings, sign out) |
| X2 Empty states | `EmptyState` component on each list |
| X3 Error states | `error.tsx` per route group + inline field errors |
| X4 Loading | `loading.tsx` per route group with `Skeleton` |
| X5 App icon | `public/` icons + manifest |

## Navigation
- **Phone:** bottom tab bar (3 tabs, 52px targets). Teacher: Classes · Courses · Settings. Student: Home · Classes · Account.
- **Desktop:** left sidebar with the same items + AppHeader.
- Proxy: no session on a protected path → `/sign-in`. Pages: `decide()` in `src/lib/auth/routing.ts` handles onboarding, pending teachers and wrong areas (`docs/auth-and-roles.md`).
- Admin (phone tab bar / sidebar): Teachers · Invites.

Server endpoints: `/api/inngest` (Inngest's handler for the generation job; signed requests only) and `/api/courses/[courseId]/export`.
