-- Stage 2 · follow-up from the Supabase advisors.

-- Supabase's "automatic RLS" toggle installs public.rls_auto_enable() for an
-- event trigger. Event triggers don't need EXECUTE, so nobody should be able
-- to call it through the API.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'rls_auto_enable') then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

-- Index foreign keys used in joins and cascades.
create index if not exists profiles_approved_by_idx on public.profiles (approved_by);
create index if not exists teacher_invites_created_by_idx on public.teacher_invites (created_by);

-- One read policy instead of two (each permissive policy runs on every query).
drop policy if exists "profiles: read own" on public.profiles;
drop policy if exists "profiles: admins read all" on public.profiles;
create policy "profiles: read own, admins read all" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
