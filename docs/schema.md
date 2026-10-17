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

**Status:** `profiles` and `teacher_invites` exist (stage 2, `20261017120000_auth_profiles_invites.sql`). The other tables below arrive with stages 3–5.

### `classes`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `teacher_id` | uuid → profiles | |
| `name` | text | |
| `join_code` | text unique | 5 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` |
| `created_at` | timestamptz | |

Joining is a `security definer` function `join_class(code)` so students never need to read the `classes` table to find a code.

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
| `class_id` | uuid → classes (cascade) | nullable while a draft has no class yet |
| `teacher_id` | uuid → profiles | |
| `title` | text | |
| `content_locale` | text | language the course is written in |
| `level` | course_level | |
| `status` | course_status | |
| `due_date` | date | nullable |
| `source_path` | text | Storage path; cleared when source is deleted |
| `created_at` / `assigned_at` / `updated_at` | timestamptz | |

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
| `quiz` | jsonb | `{ "question": "", "options": ["",…], "answer_index": 0 }` — nullable |
| `visual_svg` | text | sanitised; nullable |
| `visual_caption` | text | |
| `visual_alt` | text | required when `visual_svg` is set |

> **Quiz answers and RLS:** students can read `modules`, which includes `answer_index`. Acceptable for v1 (low-stakes checks). If it matters later, move answers to a teacher-only table and grade via a function.

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

### `announcements`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `class_id` | uuid → classes (cascade) | |
| `author_id` | uuid → profiles | |
| `body` | text | |
| `created_at` | timestamptz | |

### `generation_jobs`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `course_id` | uuid → courses (cascade) | |
| `step` | job_step | drives T2 |
| `chunks_total` / `chunks_done` | int | |
| `error` | text | |
| `created_at` / `finished_at` | timestamptz | |

### `ai_usage` (cost limits)
| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity PK | |
| `user_id` | uuid → profiles | |
| `kind` | text | `generate`, `visual`, `transcribe`, `tutor` |
| `provider` | text | e.g. `anthropic`, `openai`, `google` |
| `model` | text | model id used |
| `input_tokens` / `output_tokens` | int | |
| `created_at` | timestamptz | |

Written only by server code (service role). Used to enforce daily limits.

## Views
- `course_progress_summary` — per (course, student): modules done, total, first-attempt quiz %.
- `class_summary` — per class: student count, course count, average completion (feeds T6 stats).

## RLS policies (plain language)

Helper functions (`security definer`, stable): `is_admin()`, `is_approved_teacher()`, `teaches_class(class_id)`, `in_class(class_id)`.

| Table | Select | Insert / Update / Delete |
|---|---|---|
| `profiles` | Self; admins see all (stage 3 adds: teachers see students in their classes) | Self updates `full_name`, `ui_locale`, `theme` only (column grants); role/status only via functions |
| `teacher_invites` | Admin | Via functions only |
| `classes` | Teacher who owns it; students who are members | Owning approved teacher |
| `class_members` | Teacher of the class; the student themself | Insert via `join_class()` only; teacher or student can delete |
| `courses` | Owning teacher; class members when `status = assigned` | Owning approved teacher |
| `modules` | Same as parent course | Owning teacher; job (service role) |
| `module_progress` | The student; the class's teacher | The student, only for courses they can see |
| `quiz_attempts` | The student; the class's teacher | The student, insert only |
| `announcements` | Teacher of the class; class members | Teacher of the class |
| `generation_jobs` | Owning teacher | Service role only |
| `ai_usage` | Self (own totals) | Service role only |

Every policy gets a test. Database tests live in `tests/db/` and run with `pnpm test:db` against real Postgres (see `docs/setup-supabase.md` → Tests).

## Storage
- Bucket `sources` (private). Path `teacher_id/course_id/filename`. Teacher can upload/read own folder; jobs read with service role. Deleted after successful generation unless "keep source" is on.
- Bucket `certificates` — not needed; certificates render on demand.
