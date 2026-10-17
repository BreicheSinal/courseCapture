# Setting up Supabase

Stage 2 needs a Supabase project for sign-in and the database. About 15 minutes.

## 1. Create the project
1. Go to **supabase.com → New project**. Pick a region near your users and save the database password somewhere safe.
2. When it's ready, open **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server only — never in client code; not used until stage 5)
3. `cp .env.example .env.local` and paste them in. Set `NEXT_PUBLIC_APP_URL=http://localhost:3000`.

## 2. Run the migration
Either:
- **CLI (recommended):** `pnpm exec supabase login`, `pnpm exec supabase link --project-ref <ref>`, then `pnpm exec supabase db push`.
- **Dashboard:** SQL Editor → paste each file in `supabase/migrations/` in order (`20261017100506_auth_profiles_invites.sql`, then `20261017101500_auth_hardening.sql`) → Run.

## 3. Auth settings (Authentication → URL Configuration)
- **Site URL:** `https://invixlab.tech`
- **Redirect URLs** (every address a sign-in link may return to):
  - `https://invixlab.tech/auth/callback` — production
  - `https://course-capture-*-invix-studio.vercel.app/auth/callback` — Vercel preview deployments
  - `http://localhost:3000/auth/callback` — local development

On Vercel (`invix-studio/course-capture` → Settings → Environment Variables) set `NEXT_PUBLIC_APP_URL=https://invixlab.tech` for Production. The Supabase ↔ Vercel integration adds the Supabase URL and keys automatically.

Authentication → Providers → Email:
- Email provider **on**. "Confirm email" can stay on — the sign-in link confirms it.
- **Email OTP expiration:** 900 seconds (the screens say links work for 15 minutes).

## 4. Email templates (Authentication → Email Templates)
New people get the **Confirm signup** email; returning people get **Magic link**. Both should read as a sign-in link. Suggested subject: *Your CourseCapture sign-in link*. Keep `{{ .ConfirmationURL }}` as the button link.

### Own SMTP with Google (decision #33)
Supabase's built-in sender is test-only (about 2 emails an hour). Send through the Google account for the support address instead:
1. Sign in to Google as the support account → **Security** → turn on **2-Step Verification**.
2. **Security → App passwords** → create one named "CourseCapture" → copy the 16-character password. Your normal password won't work for SMTP.
3. Supabase → **Authentication → SMTP Settings → Enable custom SMTP**:
   - Sender email: the support address; sender name `CourseCapture`
   - Host `smtp.gmail.com`, port `465`, username: the support address, password: the app password
4. Supabase → **Authentication → Rate Limits**: raise "emails sent per hour" (e.g. 100). Google Workspace allows about 2,000 emails a day per account (a free Gmail account about 500).
5. Vercel and `.env.local` (server only; used for the approval email): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` (see `.env.example`).

The support address can be on a different domain from the app (e.g. app on `invixlab.tech`, email on another domain). That's fine: links in emails point to the app's domain; deliverability depends on the email domain's own Google Workspace SPF/DKIM records, which Google sets up for that domain.

If the support address is an alias rather than its own Google account, sign in as the real mailbox and add the alias under Gmail → Settings → Accounts → **Send mail as** first.

## 5. Google ("Continue with school account") — optional
1. Google Cloud Console → APIs & Services → Credentials → **OAuth client ID** (Web).
   Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
2. Supabase → Authentication → Providers → **Google**: paste the client ID and secret, enable.
3. Locally with the CLI: set `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `_SECRET` and turn on `[auth.external.google]` in `supabase/config.toml`.

## 6. Make yourself admin
Sign in once (pick either role), finish the name step, then in the SQL Editor:
```sql
update public.profiles set role = 'admin', status = 'approved' where email = 'you@example.com';
```
Reload — you'll land on **Admin · Teachers**. From there approve teachers and create invite codes.

## Local Supabase instead (needs Docker)
`pnpm db:start` runs Supabase locally using `supabase/config.toml` (already set: callback URL, 15-minute links, 60-second resend). Emails show up in Inbucket at http://localhost:54324. `pnpm db:reset` reapplies migrations.

## Tests
- `pnpm test:db` runs the migration and RLS tests against any Postgres (`TEST_DATABASE_URL`, default `postgres://postgres:postgres@localhost:5432/postgres`). No Docker needed: `supabase/tests/helpers/auth-shim.sql` stands in for Supabase's auth schema and roles.
