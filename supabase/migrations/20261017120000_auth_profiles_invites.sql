-- Stage 2 · Accounts: profiles, roles, teacher approval and invite codes.
-- See docs/schema.md and docs/auth-and-roles.md.
--
-- Security model
-- * RLS is on for every table, and nothing is reachable without a policy.
-- * People can edit only their own name, language and theme (column grants).
-- * Role, status and invites change only through the security-definer
--   functions below, which check the caller first.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('teacher', 'student', 'admin');
create type public.account_status as enum ('pending', 'approved', 'rejected');
create type public.theme_pref as enum ('system', 'light', 'dark');

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created by trigger
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 80),
  email       text not null default '',
  role        public.user_role,                       -- null until chosen; then fixed
  status      public.account_status not null default 'pending',
  ui_locale   text not null default 'en' check (ui_locale in ('en', 'ar', 'fr', 'es')),
  theme       public.theme_pref not null default 'system',
  approved_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_via_invite text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'App profile for each auth user. Role and status change only via functions.';

create index profiles_pending_teachers_idx on public.profiles (created_at)
  where role = 'teacher' and status = 'pending';

-- ---------------------------------------------------------------------------
-- teacher_invites: codes that approve a teacher without waiting
-- ---------------------------------------------------------------------------
create table public.teacher_invites (
  code        text primary key check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),  -- stored without the dash
  school_name text not null check (char_length(school_name) between 1 and 120),
  created_by  uuid not null references public.profiles (id) on delete cascade,
  max_uses    int not null default 1 check (max_uses between 1 and 500),
  uses        int not null default 0 check (uses >= 0),
  expires_at  timestamptz not null default now() + interval '7 days',
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);

comment on table public.teacher_invites is 'Invite codes created by admins. Redeemed via redeem_teacher_invite().';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Is the caller an approved admin? Used by policies; security definer so it
-- can read profiles without recursing through RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'approved'
  );
$$;

-- Normalises user input like "abcd-1234 " to "ABCD1234".
create or replace function public.normalize_invite_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

-- ---------------------------------------------------------------------------
-- New auth user → profile
-- The role requested at sign-in arrives in user metadata. Only teacher or
-- student is accepted (never admin). Students are approved at once; teachers
-- wait for approval unless they redeem an invite.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta   jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role   public.user_role;
  v_locale text := v_meta ->> 'locale';
begin
  if v_meta ->> 'role' in ('teacher', 'student') then
    v_role := (v_meta ->> 'role')::public.user_role;
  end if;

  insert into public.profiles (id, email, full_name, role, status, ui_locale)
  values (
    new.id,
    coalesce(new.email, ''),
    left(trim(coalesce(v_meta ->> 'full_name', v_meta ->> 'name', '')), 80),
    v_role,
    case when v_role = 'student' then 'approved'::public.account_status else 'pending'::public.account_status end,
    case when v_locale in ('en', 'ar', 'fr', 'es') then v_locale else 'en' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Onboarding: set your name and, once, your role.
-- ---------------------------------------------------------------------------
create or replace function public.complete_onboarding(p_full_name text, p_role public.user_role default null)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name    text := trim(coalesce(p_full_name, ''));
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;
  if char_length(v_name) not between 1 and 80 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;

  select * into v_profile from public.profiles where id = auth.uid() for update;
  if not found then
    raise exception 'no_profile' using errcode = 'P0002';
  end if;

  if v_profile.role is null then
    if p_role is null or p_role not in ('teacher', 'student') then
      raise exception 'role_required' using errcode = '22023';
    end if;
    update public.profiles
      set full_name = v_name,
          role = p_role,
          status = case when p_role = 'student' then 'approved'::public.account_status else 'pending'::public.account_status end
      where id = auth.uid()
      returning * into v_profile;
  else
    -- Role is already set; a different requested role is ignored, never applied.
    update public.profiles set full_name = v_name where id = auth.uid() returning * into v_profile;
  end if;

  return v_profile;
end;
$$;

-- ---------------------------------------------------------------------------
-- Invites
-- ---------------------------------------------------------------------------

-- Admin creates a code. Returns the 8-character code (shown as ABCD-1234).
create or replace function public.create_teacher_invite(
  p_school_name text,
  p_max_uses int default 1,
  p_expires_in_days int default 7
)
returns public.teacher_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes  bytea;
  v_code   text;
  v_invite public.teacher_invites;
begin
  if not public.is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_expires_in_days not between 1 and 90 then
    raise exception 'invalid_expiry' using errcode = '22023';
  end if;

  loop
    v_bytes := extensions.gen_random_bytes(8);
    v_code := '';
    for i in 0..7 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.teacher_invites where code = v_code);
  end loop;

  insert into public.teacher_invites (code, school_name, created_by, max_uses, expires_at)
  values (v_code, trim(p_school_name), auth.uid(), p_max_uses, now() + make_interval(days => p_expires_in_days))
  returning * into v_invite;

  return v_invite;
end;
$$;

-- Teacher checks a code before joining (T7e step 1). Returns the school and
-- inviter, or no row when the code is unknown, used up, expired or revoked.
create or replace function public.check_teacher_invite(p_code text)
returns table (school_name text, invited_by text)
language sql
stable
security definer
set search_path = ''
as $$
  select i.school_name, p.full_name
  from public.teacher_invites i
  join public.profiles p on p.id = i.created_by
  where i.code = public.normalize_invite_code(p_code)
    and i.revoked_at is null
    and i.expires_at > now()
    and i.uses < i.max_uses
    and exists (
      select 1 from public.profiles me
      where me.id = auth.uid() and me.role = 'teacher' and me.status <> 'approved'
    );
$$;

-- Teacher redeems a code (T7e step 2): approves the caller and uses the code once.
create or replace function public.redeem_teacher_invite(p_code text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code    text := public.normalize_invite_code(p_code);
  v_invite  public.teacher_invites;
  v_profile public.profiles;
begin
  select * into v_profile from public.profiles where id = auth.uid() for update;
  if not found or v_profile.role is distinct from 'teacher' then
    raise exception 'not_a_teacher' using errcode = '42501';
  end if;
  if v_profile.status = 'approved' then
    return v_profile;
  end if;

  select * into v_invite from public.teacher_invites where code = v_code for update;
  if not found
     or v_invite.revoked_at is not null
     or v_invite.expires_at <= now()
     or v_invite.uses >= v_invite.max_uses then
    raise exception 'invalid_invite' using errcode = '22023';
  end if;

  update public.teacher_invites set uses = uses + 1 where code = v_code;

  update public.profiles
    set status = 'approved', approved_at = now(), approved_by = v_invite.created_by, approved_via_invite = v_code
    where id = auth.uid()
    returning * into v_profile;

  return v_profile;
end;
$$;

-- Admin revokes a code.
create or replace function public.revoke_teacher_invite(p_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.teacher_invites set revoked_at = now()
    where code = public.normalize_invite_code(p_code) and revoked_at is null;
end;
$$;

-- Admin approves or rejects a teacher.
create or replace function public.set_teacher_status(p_teacher uuid, p_status public.account_status)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  update public.profiles
    set status = p_status,
        approved_at = case when p_status = 'approved' then now() else null end,
        approved_by = case when p_status = 'approved' then auth.uid() else null end
    where id = p_teacher and role = 'teacher'
    returning * into v_profile;

  if not found then
    raise exception 'not_a_teacher' using errcode = 'P0002';
  end if;
  return v_profile;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.teacher_invites enable row level security;

-- profiles: see yourself; admins see everyone.
-- (Stage 3 adds: teachers see students in their classes.)
create policy "profiles: read own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: admins read all" on public.profiles
  for select to authenticated
  using ((select public.is_admin()));

-- Update your own row — and column grants below limit which columns.
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No insert/delete policies: rows come from the trigger and go with the auth user.

create policy "invites: admins read" on public.teacher_invites
  for select to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Privileges
-- Supabase grants everything on public tables to anon/authenticated by
-- default; take it back and grant only what's needed.
-- ---------------------------------------------------------------------------
revoke all on public.profiles from anon, authenticated;
revoke all on public.teacher_invites from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, ui_locale, theme) on public.profiles to authenticated;
grant select on public.teacher_invites to authenticated;

revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.complete_onboarding(text, public.user_role) from public, anon;
revoke execute on function public.create_teacher_invite(text, int, int) from public, anon;
revoke execute on function public.check_teacher_invite(text) from public, anon;
revoke execute on function public.redeem_teacher_invite(text) from public, anon;
revoke execute on function public.revoke_teacher_invite(text) from public, anon;
revoke execute on function public.set_teacher_status(uuid, public.account_status) from public, anon;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.complete_onboarding(text, public.user_role) to authenticated;
grant execute on function public.create_teacher_invite(text, int, int) to authenticated;
grant execute on function public.check_teacher_invite(text) to authenticated;
grant execute on function public.redeem_teacher_invite(text) to authenticated;
grant execute on function public.revoke_teacher_invite(text) to authenticated;
grant execute on function public.set_teacher_status(uuid, public.account_status) to authenticated;
