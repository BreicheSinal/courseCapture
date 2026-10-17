# Auth and roles

Built in stage 2. Setup: `docs/setup-supabase.md`.

## Sign-in (T7)
- The person picks **I'm a teacher / I'm a student** on the sign-in screen, then asks for a sign-in link by email (Supabase magic link) → T7b / S0b "Check your email" with a 60-second resend. Email is the only sign-in method (decision #34).
- Links work for 15 minutes, on any device. The email templates (`supabase/templates/`) link straight to `/auth/callback?…&token_hash=…&type=email`; the callback verifies the hash on the server (`verifyOtp`), so a link asked for on a laptop can be opened on a phone.
- Supabase's default link (`?code=`, PKCE) still works but only in the browser that asked for it; the callback accepts both.
- The callback then applies the saved theme and redirects.
- When an admin approves a teacher, the app emails them ("You're approved") in their interface language through the same SMTP account (`src/lib/email/`, `SMTP_*` env vars). A mail failure is logged and never blocks the approval.

## Accounts
```
sign in ──► auth user created ──► trigger creates profile
                                   role = picked role (teacher/student only; never admin)
                                   status = approved (student) | pending (teacher)
first visit ──► /onboarding/profile: ask for a name (and role, if the account has none)
teacher ──► /onboarding/pending (T7d) ── admin approves ──► /teacher
                 └── /onboarding/invite (T7e): valid code ──► approved at once ──► /teacher
student ──► /student
admin   ──► /admin/teachers
```

Role is fixed once set. Picking the other role at sign-in with an existing account shows **T7c Wrong account type** instead of changing it.

## Where people are sent
One pure function, `decide(profile, page)` in `src/lib/auth/routing.ts` (unit-tested), decides every redirect:

| Situation | Goes to |
|---|---|
| Signed out on a protected page | `/sign-in` (the proxy does this before rendering) |
| Signed in on `/sign-in` or `/` | their home |
| No name or no role yet | `/onboarding/profile` |
| Teacher not approved | `/onboarding/pending` (and `/onboarding/invite`) |
| Wrong area for their role | `/wrong-account?area=…` |
| Admin | `/admin/teachers` |

Checks happen in three places: the **proxy** (signed in at all?), each **page or layout** on the server (`guard()` / `requireSession()` in `src/lib/auth/session.ts`), and **RLS + security-definer functions** in Postgres — the real boundary.

## Approval and invite codes
- Admins see pending teachers at `/admin/teachers` and approve or reject them (`set_teacher_status`).
- Admins create codes at `/admin/invites` with a school name, number of uses (default 1) and expiry (default 7 days). Codes are 8 characters without look-alikes (`ABCD-1234`).
- Teachers check a code (shows the school and who invited them), then join. Redeeming locks the code row so two teachers can't use the last seat at once.
- A rejected teacher sees "Not approved" on T7d and can still use an invite code.
- Approval emails: not sent yet (open question in `docs/decisions.md`). "Check again" on T7d picks up approval immediately.

## First admin
Set by hand in SQL — see `docs/setup-supabase.md` step 6. Admins can't be created from the app.

## Account menu (X1)
The person chip in the header (avatar only on phones) opens: name and role, **Join another class** (students), **Appearance** (Light / Dark / System, saved to the profile), **Sign out**.
