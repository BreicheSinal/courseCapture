# Auth and roles

## Sign-in methods
- Email magic link (Supabase Auth OTP) → T7b/S0b "Check your email".
- Google OAuth.
- Later: school SSO (SAML via Supabase).

## First sign-in
```
sign in ──► profile created by DB trigger (role = null)
        └─► /onboarding/role
              ├─ Student ─► role=student, status=approved ─► /student/join
              └─ Teacher ─► has invite code? ── yes ─► redeem_teacher_invite() ─► approved ─► /teacher
                                             └─ no  ─► status=pending ─► /onboarding/pending
```

## Approval
- Admin sees pending teachers at `/admin/teachers`; approve → `approved`, reject → `rejected` (sees a message on T7d).
- Notify the teacher by email on approval (Supabase email or Resend — to decide).
- The first admin is set manually in SQL (the owner's account).

## Invite codes
- Created by admins at `/admin/invites`; single-use by default, optional expiry and use count.
- Entered on T7e, or via link `/onboarding/invite?code=XXXX`.

## Guards (in order, in middleware + server)
1. No session → `/sign-in`.
2. No role → `/onboarding/role`.
3. Teacher with `pending`/`rejected` → `/onboarding/pending`.
4. Path role ≠ user role → `/wrong-account`.
5. Server actions re-check role and ownership; RLS is the final guard.

## Role changes
Not available to users. An admin can change a role (e.g. a teacher who signed up as a student). Owners can impersonate roles only in local development via a seed account per role.
