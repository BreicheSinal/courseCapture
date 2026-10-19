# Database schema

Supabase Postgres. Every table has row-level security (RLS) **enabled** and **no access by default**; the policies below are the only way in. Timestamps are `timestamptz` defaulting to `now()`. IDs are `uuid` unless noted.

## Overview

```
auth.users ─1:1─ profiles
profiles(teacher) ─1:n─ classes ─1:n─ courses ─1:n─ modules
classes ─n:m─ profiles(student)   via class_members
modules ─1:n─ module_progress, quiz_attempts   (per student)
classes ─1:n─ announcements
courses ─1:n─ generation_jobs
profiles(admin) ─1:n─ teacher_invites
```

## Enums
| Enum | Values |
|---|---|
| `user_role` | `teacher`, `student`, `admin` |
| `account_status` | `pending`, `approved`, `rejected` |
| `course_status` | `draft`, `assigned`, `archived` |
| `course_level` | `beginner`, `intermediate`, `advanced` |
| `job_step` | `queued`, `reading`, `writing`, `drawing`, `done`, `failed` |
| `theme_pref` | `system`, `light`, `dark` |

## Tables

### `profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | = `auth.users.id` |
| `full_name` | text | |
| `email` | text | copied from auth for display |
| `role` | user_role | null until chosen; then immutable (except by admin) |
| `status` | account_status | students → `approved`; teachers → `pending` unless invite redeemed |
| `ui_locale` | text | `en` / `ar` / `fr` / `es` |
| `theme` | theme_pref | default `system` |
| `approved_at` / `approved_by` | timestamptz / uuid | who approved, and when |
| `approved_via_invite` | text | the invite code used, if any |
| `default_course_locale` | text | T14 "New course defaults"; `en`/`ar`/`fr`/`es` |
| `default_course_level` | course_level | T14; default `intermediate` |
| `created_at` / `updated_at` | timestamptz | |

### `teacher_invites`
| Column | Type | Notes |
|---|---|---|
| `code` | text PK | 8 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, stored without the dash |
| `school_name` | text | shown to the teacher on T7e |
| `created_by` | uuid → profiles | admin |
| `max_uses` | int | default 1 |
| `uses` | int | default 0 |
| `expires_at` | timestamptz | default now + 7 days |
| `revoked_at` | timestamptz | nullable |
| `created_at` | timestamptz | |

Functions (all `security definer`, `search_path = ''`, caller checked first):
- `create_teacher_invite(school, max_uses, days)` — admins only; generates the code with `gen_random_bytes`.
- `check_teacher_invite(code)` — pending/rejected teachers only; returns school and inviter for a valid code, else nothing.
- `redeem_teacher_invite(code)` — locks the code row, checks expiry/uses/revoked, increments `uses`, approves the caller.
- `revoke_teacher_invite(code)` — admins only.

Profile functions: `handle_new_user()` (trigger on `auth.users`), `complete_onboarding(name, role)` (sets the name, and the role once), `set_teacher_status(id, approved|rejected)` (admins only), `is_admin()`.

**Status:**
- Stage 2 (`20261017100506_auth_profiles_invites.sql`, `20261017101500_auth_hardening.sql`): `profiles`, `teacher_invites`.
- Stage 3 (`20261017191107_classes_courses.sql`): `classes`, `class_members`, `announcements`, `announcement_reads`, and the course tables the class pages read (`courses`, `course_assignments`, `modules`, `module_progress`, `quiz_attempts`). Course content and progress are **read-only to clients** until stages 4–5 add their write paths. Profiles gain `default_course_locale` and `default_course_level` (T14).
- Stage 4 (`20261018085156_student_learning.sql`): `quiz_answers`, and the student write paths and reads below. Students write progress and quiz attempts only through functions.
- Stage 5 (`20261018120000_course_generation.sql`): `generation_jobs`, `ai_usage`, the private `sources` bucket, module review state (`review_note`, `checked_at`), and the teacher's write paths for courses, modules and assignments. Generated content is written by server code with the service role.

### `classes`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `teacher_id` | uuid → profiles | |
| `name` | text | 1–60 characters |
| `section` | text | optional, ≤ 40 ("Period 3"); students see it |
| `join_code` | text unique | 5 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` |
| `created_at` | timestamptz | |

Joining is a `security definer` function `join_class(code)` so students never need to read the `classes` table to find a code.

Class functions (`security definer`, `search_path = ''`, caller checked first):
- `create_class(name, section)` — approved teachers only; generates the code (`new_join_code()`, `gen_random_bytes`). Clients can't insert classes directly.
- `regenerate_join_code(class)` — the class's approved teacher; the old code stops working at once.
- `join_class(code)` — approved students; ignores case, spaces and dashes; joining twice is a no-op. (S1 screen: stage 4.)

Read helpers for the teacher screens (`security invoker`, so RLS decides what they see): `teacher_class_summaries()` (T10), `class_course_stats(class)` (T6), `class_roster(class, course)` (T11).

### `class_members`
| Column | Type | Notes |
|---|---|---|
| `class_id` | uuid → classes (cascade) | PK part |
| `student_id` | uuid → profiles (cascade) | PK part |
| `joined_at` | timestamptz | |

### `courses`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| — | | Classes are linked through `course_assignments` (decision #28) |
| `teacher_id` | uuid → profiles | |
| `title` | text | |
| `content_locale` | text | language the course is written in |
| `level` | course_level | |
| `status` | course_status | |
| `source_name` | text | original filename only; the file itself is deleted after generation (#25) |
| `created_at` / `assigned_at` / `updated_at` | timestamptz | |

### `course_assignments`
One course in many classes (decision #28).

| Column | Type | Notes |
|---|---|---|
| `course_id` | uuid → courses (cascade) | PK part |
| `class_id` | uuid → classes (cascade) | PK part |
| `due_date` | date | nullable; per class |
| `assigned_at` | timestamptz | |

### `modules`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `course_id` | uuid → courses (cascade) | |
| `position` | int | unique per course |
| `heading` | text | |
| `body` | text | |
| `key_points` | text[] | |
| `flashcards` | jsonb | `[{ "q": "", "a": "" }]` |
| `quiz` | jsonb | `{ "question": "", "options": ["",…] }` — nullable; no answer here |
| `visual_svg` | text | sanitised; nullable |
| `visual_caption` | text | |
| `visual_alt` | text | required when `visual_svg` is set |
| `review_note` | text | ≤ 200; why the module should be checked (T3 "Needs a check"); null when nothing to flag. **Not readable by clients** (it may describe the quiz): the owning teacher reads it through `module_review_notes(course)` |
| `checked_at` | timestamptz | when the teacher marked it checked (T4); null = not checked |

From stage 5, clients have a column-level `select` on `modules` that leaves out `review_note`, so `select *` as a signed-in user fails: list the columns. `flashcards` holds at most 8 cards (`modules_flashcards_shape`). `(course_id, position)` is unique and deferrable, so `move_module()` can swap two positions in one statement.

### `quiz_answers` (teacher-only)
| Column | Type | Notes |
|---|---|---|
| `module_id` | uuid PK → modules (cascade) | |
| `answer_index` | int | 0-based index into `modules.quiz.options` |
| `explanation` | text | ≤ 600; shown after the student answers |

`modules.quiz` is checked by the `modules_quiz_shape` constraint: only `question` (string) and `options` (2–10 items), so an answer can't be stored next to the question by mistake. The generation job writes `quiz_answers` with the service role; teachers change it only through `save_module()`.

Students never read this table. Student functions (stage 4, `security definer`, approved student who can see the course — `studies_course()`):
- `answer_quiz(module, choice)` — records the attempt (the first per module is `is_first`, under a per-student lock so two quick taps can't both count) and only then returns whether it was right, the right index and the explanation (decision #26).
- `my_quiz_result(module)` — the student's own first answer, to show it again on a revisit.
- `complete_module(module)` — records progress once; returns the course, done and total. Refuses (`quiz_first`) a module whose quick check hasn't been answered.
- `student_classes()`, `student_courses()`, `student_course_modules(course)`, `student_announcements(class?, limit)` — the student's own classes (with the teacher's name only), assigned courses with progress, module states and announcements with "seen".
- `mark_announcements_seen(ids)` — marks up to 50 announcements seen; ids outside the caller's classes are ignored.
- Students of a teacher who is no longer approved lose access to that teacher's courses (`studies_course()` checks both).

### `module_progress`
| Column | Type | Notes |
|---|---|---|
| `student_id` | uuid → profiles (cascade) | PK part |
| `module_id` | uuid → modules (cascade) | PK part |
| `course_id` | uuid → courses (cascade) | denormalised for fast per-course counts |
| `completed_at` | timestamptz | |

### `quiz_attempts`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `student_id` | uuid → profiles (cascade) | |
| `module_id` | uuid → modules (cascade) | |
| `course_id` | uuid → courses (cascade) | |
| `chosen_index` | int | |
| `is_correct` | bool | |
| `is_first` | bool | only first attempts count toward the score (unique partial index) |
| `created_at` | timestamptz | |

### `announcement_reads`
| Column | Type | Notes |
|---|---|---|
| `announcement_id` | uuid → announcements (cascade) | PK part |
| `student_id` | uuid → profiles (cascade) | PK part; defaults to the caller |
| `seen_at` | timestamptz | |

Feeds "seen by N" on T13. Students insert their own row (stage 4).

### `announcements`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `class_id` | uuid → classes (cascade) | |
| `author_id` | uuid → profiles | |
| `body` | text | |
| `created_at` | timestamptz | |

### `generation_jobs`
One row per "Generate course" (T1 → T2). Server code writes it with the service role; the course's teacher reads it. A trigger (`check_generation_job`) requires the job's `teacher_id` to be the course's teacher and refuses a job for an **assigned** course, because a new run replaces every module and students' progress with it. A job still unfinished after 30 minutes counts as dead: the app marks it failed, and `assign_course()` ignores it.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `course_id` | uuid → courses (cascade) | one running job per course (partial unique index on unfinished steps) |
| `teacher_id` | uuid → profiles (cascade) | |
| `step` | job_step | `queued`, `reading`, `writing`, `drawing`, `done`, `failed` — drives T2 |
| `source_kind` | text | `pdf`, `pptx`, `text` (TXT/MD file) or `paste` |
| `source_path` | text | object in the `sources` bucket; null for pasted text, and once the file is deleted |
| `notes` | text | ≤ 500; the teacher's "Notes for Claude" |
| `pages_total` / `pages_scanned` | int | for "12 pages, 3 scanned" on T2 |
| `chunks_total` / `chunks_done` | int | at most 4 chunks |
| `modules_total` / `modules_drawn` | int | diagram progress |
| `fallback_chunks` | int | chunks the basic splitter wrote (T3 shows a note) |
| `error` | text | a key T2 translates (`teacher.generating.errors.*`) |
| `created_at` / `started_at` / `finished_at` | timestamptz | |

### `ai_usage` (cost limits)
| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity PK | |
| `user_id` | uuid → profiles (cascade) | |
| `kind` | text | `generate`, `redraw` or `tutor` (reading a scan is part of its generation) |
| `provider` / `model` | text | what was used |
| `input_tokens` / `output_tokens` | int | added up over the action's model calls |
| `created_at` | timestamptz | |

Written only by server code (service role):
- `claim_ai_use(user, kind, limit, provider, model)` — counts today's (UTC) rows of that kind under a per-person lock and raises `daily_limit` at the limit, else inserts the row. Called before every counted action.
- `add_ai_tokens(use, input, output)` — adds a model call's tokens to the claimed row.
- `my_ai_usage_today()` — the caller's counts per kind, for "n generations left today".

### `contact_attempts` (contact form rate limit, #59)
| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity PK | |
| `sender_hash` | text | SHA-256 of a salt and the sender's IP; never the IP or the message |
| `created_at` | timestamptz | |

RLS on, no policies, no grants: nobody but the service role touches it. `claim_contact_slot(sender, limit, window)` (service role only) removes rows older than a day, then returns false if the sender already has `limit` in `window`, else records one and returns true. The server allows 5 an hour.

## Teacher write paths (stage 5)
Teachers create, rename and delete their own courses directly: RLS plus column grants (`insert (teacher_id, title, content_locale, level, source_name)`, `update (title, content_locale, level)`). Titles are trimmed by a trigger. Everything else goes through security-definer functions that first check the caller owns the course (`owned_module_course()`):
- `save_module(…)` — T4 "Save": heading, body, key points, flashcards, quiz with its answer and explanation, caption and alt text, in one transaction.
- `set_module_checked(module, checked)` — T4 "Mark as checked" and undo.
- `clear_module_visual(module)` — T4 "Remove diagram". New diagrams come from the server (redraw), never the browser.
- `move_module(module, ±1)` — T3 "Move up / down".
- `delete_module(module)` — closes the gap in positions; a course keeps at least one module.
- `assign_course(course, class, due)` / `unassign_course(course, class)` — T5: one row per class with its own due date (#28). Assigning needs a finished job and at least one module and makes the course `assigned`; with no classes left it goes back to `draft`.

## Read functions (instead of views)
Security definer, caller checked first (approved teacher of the class), set-based, and returning only what the screens show:
- `teacher_class_summaries()` — T10: per class, students, courses and students overdue.
- `class_course_stats(class)` — T6: per assigned course, modules and students started / complete / overdue.
- `class_roster(class, course)` — T11/T12: students' **name and email only**, modules done and first-try quiz results. Teachers can't read the rest of a student's profile.

## RLS policies (plain language)

Helper functions (`security definer`, stable): `is_admin()`, `is_approved_teacher()`, `teaches_class(class_id)`, `in_class(class_id)`, `owns_course(course_id)`, `can_see_course(course_id)`. The teacher helpers also require the caller to be an **approved** teacher, so a teacher who is later rejected loses access to their classes and students at once.

Other rules in the stage 3 migration:
- `join_class()` only finds classes of approved teachers, and refuses after 10 wrong codes per student per hour (`join_attempts`, not readable by clients).
- `module_progress` and `quiz_attempts` reference `(module_id, course_id)` together, so a row's course is always the module's course.
- A course can only be assigned to a class of the same teacher (trigger on `course_assignments`).
- Class names and sections are trimmed on every write (trigger).
- Students see a course only while it's `assigned`.
- Deleting a class removes its members, announcements (and reads) and assignments. Students' progress on the courses stays with the course (decision #43).
- Deleting a course, or one of its modules (T4), removes students' progress and quiz attempts on it (cascade). T4 says so before deleting.

| Table | Select | Insert / Update / Delete |
|---|---|---|
| `profiles` | Self; admins see all (teachers get students' name and email through `class_roster()` only) | Self updates `full_name`, `ui_locale`, `theme` only (column grants); role/status only via functions |
| `teacher_invites` | Admin | Via functions only |
| `classes` | Teacher who owns it; students who are members | Created via `create_class()`; owning approved teacher renames (`name`, `section` only); owner deletes (members, announcements and assignments cascade; courses stay) |
| `class_members` | Teacher of the class; the student themself | Insert via `join_class()` only; teacher removes, student leaves |
| `courses` | Owning teacher; members of any class it's assigned to | Owning approved teacher creates drafts, renames (column grants) and deletes; status changes via `assign_course()` / `unassign_course()` |
| `course_assignments` | Owning teacher; class members, only for courses that are assigned (not drafts) | Via `assign_course()` / `unassign_course()` (owning teacher of both the course and the class) |
| `quiz_answers` | Owning teacher only | Job (service role); teacher via `save_module()` |
| `modules` | Same as parent course | Job (service role); teacher via the module functions above |
| `module_progress` | The student; the course's (approved) teacher | Via `complete_module()` only |
| `quiz_attempts` | The student; the course's (approved) teacher | Via `answer_quiz()` (stage 4) |
| `announcements` | Teacher of the class; class members | Approved teacher of the class posts (`author_id` = caller); teacher deletes; no edits |
| `announcement_reads` | The student; the class's teacher | Via `mark_announcements_seen()` (or a direct insert of their own row), for announcements in their classes |
| `generation_jobs` | Owning teacher | Service role only |
| `ai_usage` | Self (own totals) | Service role only |

Every policy gets a test. Database tests live in `tests/db/` and run with `pnpm test:db` against real Postgres (see `docs/setup-supabase.md` → Tests).

## Storage
- Bucket `sources` (private, 20 MB, PDF / PPTX / text types). Path `teacher_id/upload_id/filename`. There are **no client storage policies**: the server hands the browser a signed upload URL for one path, and only the service role reads or deletes. The file is deleted when generation finishes; it stays after a failure so "Try again" works, and an upload that never became a job is removed after a day (swept on the teacher's next upload). Only `courses.source_name` remains (decision #25).
- Certificates: PDFs made in the student's browser (jsPDF with the Noto fonts in `public/fonts`); nothing is generated on the server or stored.
