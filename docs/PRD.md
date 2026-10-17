# CourseCapture — Product Requirements Document

| | |
|---|---|
| **Status** | Draft v0.1 — for review |
| **Owner** | Sinal Breiche |
| **Last updated** | 2026-10-17 |
| **Design** | Claude Design canvas "CourseCapture core paths" (phone + desktop, light + dark) |
| **Design system** | CourseCapture (see `docs/design-system.md`) |
| **Stack** | Next.js · Supabase · AI provider (Anthropic, OpenAI, Google…) · Vercel (see `docs/architecture.md`) |

---

## 1. Summary

CourseCapture turns papers and slide decks into short interactive courses. A teacher uploads a PDF (including scanned pages), a PPTX, a TXT/MD file, or pastes text. Claude builds a course of modules — each with an explanation, key points, flashcards, a quick-check quiz and an AI-drawn diagram — in the language and level the teacher picks. The teacher reviews and edits everything, sets a due date and assigns the course to a class. Students join the class with a five-character code, work through the modules, take the quizzes, ask Claude questions about a module, and earn a completion certificate. Teachers see each student's progress and quiz scores.

Today the product exists as a single HTML artifact that only runs inside claude.ai. This project rebuilds it as a standalone web app (installable as a PWA) with its own accounts, database and server-side AI calls.

## 2. Problem

- Turning a paper or a lecture deck into something students actually work through takes teachers hours: summarising, writing questions, drawing diagrams.
- Teachers have little visibility into whether students read assigned material or understood it.
- Existing LMS tools store files; they don't transform them into active learning.

## 3. Goals and non-goals

### Goals (v1)
1. A teacher can go from an uploaded file to an assigned, reviewed course in under 10 minutes.
2. A student can join a class and start a course in under 1 minute on a phone.
3. Teachers can see completion and quiz scores per student and per course.
4. The app works well on phones and desktops, in light and dark mode, and in English and Arabic (right-to-left) from day one, with French and Spanish ready.
5. The AI provider key never reaches the browser, and the provider can be changed by configuration.

### Non-goals (v1)
- Grades export, LMS integrations (Google Classroom, Canvas, Moodle).
- Native iOS/Android apps (PWA first; Capacitor/Expo later).
- Video or audio sources.
- Student-to-student features (chat, forums).
- Payments / plans.

## 4. Users and roles

| Role | Who | Can |
|---|---|---|
| **Teacher** | Creates classes and courses | Create/rename/delete classes, rotate join codes, build/edit/assign/delete courses, post announcements, see roster and progress, export a course as HTML |
| **Student** | Joins classes | Join with a code, take courses, answer quizzes, ask Claude about a module, see announcements, get a certificate |
| **Admin** | The operator (initially the owner) | Approve or reject pending teachers, issue teacher invite codes |

A user has exactly one role. Choosing the wrong one is handled by the "Wrong account type" screen (T7c), not by switching roles freely.

## 5. User flows (matches the design canvas)

### 5.1 Sign-in and onboarding
- **T7 Sign in** — email magic link. → **T7b / S0b Check your email**.
- First sign-in → choose role (teacher / student).
- **Teacher path:** if they have a valid **teacher invite code (T7e)** they are approved immediately; otherwise **T7d Pending approval** until an admin approves.
- **Student path:** approved immediately; lands on **S1 Join**.
- **T7c Wrong account type** — shown when a signed-in user opens an area for the other role.

### 5.2 Teacher: classes
- **T8 First run** → **T9 Create class** → **T10 Class list**.
- **T6 Class page** — join code (copy / generate new), stats (students, courses, average completion), announcements, courses with per-student progress.
- **T11 Roster** and **T12 Student panel** (one student's progress across courses, quiz results).
- **T13 New announcement**.
- **T15 Delete class** (destructive confirmation).
- **T14 Settings** — profile, language, theme, sign out.

### 5.3 Teacher: course creation ("upload to assign")
1. **T1 New course** — upload file or paste text; choose course language and level (beginner / intermediate / advanced). Stepper step 1 of 3.
2. **T2 Generating** — progress by step (reading → writing modules → drawing diagrams); can leave the page and come back.
3. **T3 Review course** — list of modules, reorder/delete, title.
4. **T4 Edit module** — heading, body, key points, flashcards, quiz (question, options, correct answer), diagram (regenerate / remove, caption, alt text).
5. **T5 Assign** — class picker, due date picker, assign. Drafts are saved automatically at every step.
- **T16 Courses** — all of a teacher's courses across classes, including drafts.
- **Export HTML** — download a standalone page of the course.

### 5.4 Student
- **S1 Join** — enter code → "No class with that code." on failure.
- **S2 Home** — announcements, assigned courses with progress, due dates, overdue flag.
- **S7 Class page**, **S8 Course overview** (modules list, progress, continue).
- **S3 Module reader** — explanation, diagram, key points, flashcard.
- **S4 Quick check** — one quiz per module; first answer counts; shows correct/incorrect with words, not colour only.
- **S5 Ask Claude** — sheet with a question box and answers grounded in the current module.
- **S6 Finish** — completion certificate for the course.

### 5.5 Shared states
- **X1 Account menu**, **X2 Empty states**, **X3 Error states**, **X4 Loading**, **X5 App icon**, **X6 Splash** (PWA).

## 6. Functional requirements

### Accounts
- FR-1 Sign in with an email magic link. Google and school SSO (SAML) are later additions.
- FR-2 Role is set once on first sign-in and stored on the profile.
- FR-3 Teachers start as `pending` unless they redeem a valid invite code; pending teachers can only see T7d.
- FR-4 Admins can list pending teachers and approve/reject them, and create single-use or limited-use invite codes.

### Classes
- FR-5 A class has a name and a unique five-character join code (alphabet without 0/O/1/I).
- FR-6 Teachers can generate a new code (old one stops working) and delete a class (with confirmation; removes its courses, memberships, announcements and progress).
- FR-7 Students can be in many classes; a teacher can remove a student from a class.

### Courses
- FR-8 Sources: PDF (text layer), scanned PDF (vision transcription, first 8 pages), PPTX, TXT, MD, pasted text. Max file size 20 MB.
- FR-9 Generation runs as a background job; the teacher sees step progress and can leave the page.
- FR-10 Long sources are split into up to 4 chunks of ~12k characters; each chunk produces 3–5 modules (single chunk: 3–7).
- FR-11 Each module: heading, 2–4 sentence body, 3 key points, 2 flashcards, 1 multiple-choice quiz (4 options, one correct), optional SVG diagram with caption and alt text.
- FR-12 Every AI-produced SVG is sanitised on the server before it is stored (no scripts, foreignObject, images, links, event handlers or `url()`).
- FR-13 If AI generation fails, fall back to a basic paragraph splitter and tell the teacher.
- FR-14 Courses are `draft` until assigned; drafts autosave.
- FR-15 A course belongs to one class; it can be duplicated into another class.
- FR-16 Optional due date; student views mark overdue courses with the word "Overdue".
- FR-17 Export a course as a standalone HTML file.

### Learning
- FR-18 Completing a module ("Complete & next") records it; progress is "done / total".
- FR-19 The first quiz answer per module is recorded as correct/incorrect; later attempts are shown but not scored.
- FR-20 Ask Claude answers using only the current module as context; short answers; rate-limited per student.
- FR-21 A certificate appears when all modules are complete; it can be downloaded or printed.

### Announcements
- FR-22 Teachers post and delete text announcements per class; students see the newest across their classes on Home.

### Preferences
- FR-23 Interface language (en, ar, fr, es) — independent of a course's content language.
- FR-24 Theme: System (default), Light, Dark — remembered per user and per device, applied before first paint (no flash).

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| **Security** | Row-level security on every table; the browser never sees the AI provider key or the Supabase service key; uploads scanned for type and size; SVG sanitised server-side. |
| **Privacy** | Students see only their own progress; teachers see only students in their classes. Uploaded source files are deleted after generation unless the teacher keeps them. |
| **Accessibility** | WCAG 2.2 AA: text contrast from the design-system tokens, 44px touch targets, visible focus ring, full keyboard use, `aria-label` on icon buttons, alt text on diagrams, reduced-motion respected. |
| **Internationalisation** | All UI strings in message files; RTL layout via logical CSS properties; dates and numbers through `Intl`. |
| **Theming** | Every colour comes from a design-system token with Light and Dark values. No literal colours in components. |
| **Performance** | First load under 2.5s LCP on 4G for student screens; course player usable offline once opened (PWA cache). |
| **Cost** | Per-teacher daily generation limit and per-student tutor limit, configurable. Prompt caching where possible. |
| **Reliability** | Generation jobs are retried; partial results are kept; failures are visible on T2 with a retry action. |

## 8. Success metrics
- Time from upload to assigned course (median) < 10 min.
- % of generated modules the teacher keeps without deleting > 80%.
- Course completion rate among students who open a course > 60%.
- Weekly active teachers, weekly active students.

## 9. Release plan
1. **Foundation** — project setup, design tokens, themes, i18n, layout shell.
2. **Accounts** — sign-in, roles, approval, invite codes.
3. **Teacher screens** — classes, roster, announcements, settings.
4. **Student screens** — join, home, course overview, reader, quiz, certificate.
5. **Course generation** — upload, background job, review, edit, assign, export.
6. **Ask Claude**, PWA, polish, launch.

## 10. Open questions
See `docs/decisions.md` → *Open questions*.
