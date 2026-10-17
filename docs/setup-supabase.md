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

### Own SMTP with Resend (decision #33)
Supabase's built-in sender is test-only (about 2 emails an hour). Send through Resend's free plan instead (3,000 emails a month):
1. Create a free account at resend.com → **Domains → Add domain** → `invixlab.tech`. Add the DNS records it shows (SPF, DKIM) where the domain's DNS is managed, and wait for **Verified**.
2. Resend → **API Keys → Create** (sending access). Copy the key.
3. Supabase → **Authentication → SMTP Settings → Enable custom SMTP**:
   - Sender email `noreply@invixlab.tech`, sender name `CourseCapture`
   - Host `smtp.resend.com`, port `465`, username `resend`, password = the API key
4. Supabase → **Authentication → Rate Limits**: raise "emails sent per hour" (e.g. 100).
5. Vercel and `.env.local`: `RESEND_API_KEY=<the key>` and `EMAIL_FROM="CourseCapture <noreply@invixlab.tech>"` (server only; used for the approval email).

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
