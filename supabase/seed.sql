-- Local development seed (runs on `pnpm db:reset`).
-- Accounts are created by signing in (Inbucket at http://localhost:54324 shows the emails).
-- To make your local account an admin after signing in once:
--   update public.profiles set role = 'admin', status = 'approved' where email = 'you@example.com';
select 1;
