-- Stage 3 · Teacher screens: classes, roster, announcements, and the course
-- tables the class pages read. See docs/schema.md.
--
-- Security model (same as stage 2)
-- * RLS on every table; nothing reachable without a policy.
-- * Teachers reach only classes they own and the students in them.
-- * Students reach only classes they joined (screens arrive in stage 4).
-- * Classes are created and join codes changed only through the functions
--   below, which check the caller. Course content is written by later stages;
--   for now these tables are read-only to clients.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.course_status as enum ('draft', 'assigned', 'archived');
create type public.course_level as enum ('beginner', 'intermediate', 'advanced');

-- ---------------------------------------------------------------------------
-- New course defaults on the teacher's profile (T14 Settings)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column default_course_locale text not null default 'en'
    check (default_course_locale in ('en', 'ar', 'fr', 'es')),
  add column default_course_level public.course_level not null default 'intermediate';

grant update (default_course_locale, default_course_level) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.classes (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 60),
  section    text not null default '' check (char_length(section) <= 40),
  join_code  text not null unique check (join_code ~ '^[A-HJ-NP-Z2-9]{5}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.classes is 'A teacher''s class. Created via create_class(); code changed via regenerate_join_code().';
create index classes_teacher_idx on public.classes (teacher_id, created_at);

create trigger classes_set_updated_at
  before update on public.classes
  for each row execute function public.set_updated_at();

create table public.class_members (
  class_id   uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (class_id, student_id)
);
comment on table public.class_members is 'Students in a class. Added via join_class(); removed by the teacher or the student.';
create index class_members_student_idx on public.class_members (student_id);

create table public.announcements (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes (id) on delete cascade,
  author_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body       text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index announcements_class_idx on public.announcements (class_id, created_at desc);
create index announcements_author_idx on public.announcements (author_id);

create table public.announcement_reads (
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  student_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  seen_at         timestamptz not null default now(),
  primary key (announcement_id, student_id)
);
comment on table public.announcement_reads is 'Which students saw an announcement ("seen by" on T13). Written by students in stage 4.';
create index announcement_reads_student_idx on public.announcement_reads (student_id);

create table public.courses (
  id             uuid primary key default gen_random_uuid(),
  teacher_id     uuid not null references public.profiles (id) on delete cascade,
  title          text not null check (char_length(trim(title)) between 1 and 120),
  content_locale text not null default 'en' check (char_length(content_locale) between 2 and 10),
  level          public.course_level not null default 'intermediate',
  status         public.course_status not null default 'draft',
  source_name    text check (char_length(source_name) <= 255),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  assigned_at    timestamptz
);
create index courses_teacher_idx on public.courses (teacher_id, updated_at desc);

create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

-- One course in many classes, each with its own due date (decision #28).
create table public.course_assignments (
  course_id   uuid not null references public.courses (id) on delete cascade,
  class_id    uuid not null references public.classes (id) on delete cascade,
  due_date    date,
  assigned_at timestamptz not null default now(),
  primary key (course_id, class_id)
);
create index course_assignments_class_idx on public.course_assignments (class_id);

create table public.modules (
  id             uuid primary key default gen_random_uuid(),
  course_id      uuid not null references public.courses (id) on delete cascade,
  position       int not null check (position >= 1),
  heading        text not null default '',
  body           text not null default '',
  key_points     text[] not null default '{}',
  flashcards     jsonb not null default '[]'::jsonb,
  quiz           jsonb,                      -- question + options only; the answer lives elsewhere (decision #26)
  visual_svg     text,
  visual_caption text,
  visual_alt     text,
  unique (course_id, position),
  unique (id, course_id),                      -- target of the composite keys below
  check (visual_svg is null or char_length(coalesce(visual_alt, '')) > 0)
);

create table public.module_progress (
  student_id   uuid not null references public.profiles (id) on delete cascade,
  module_id    uuid not null,
  course_id    uuid not null references public.courses (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (student_id, module_id),
  -- course_id must be the module's own course (counts are per course).
  foreign key (module_id, course_id) references public.modules (id, course_id) on delete cascade
);
create index module_progress_course_idx on public.module_progress (course_id, student_id);
create index module_progress_module_idx on public.module_progress (module_id, course_id);

create table public.quiz_attempts (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles (id) on delete cascade,
  module_id    uuid not null,
  course_id    uuid not null references public.courses (id) on delete cascade,
  chosen_index int not null check (chosen_index between 0 and 9),
  is_correct   boolean not null,
  is_first     boolean not null default false,
  created_at   timestamptz not null default now(),
  foreign key (module_id, course_id) references public.modules (id, course_id) on delete cascade
);
create unique index quiz_attempts_first_idx on public.quiz_attempts (student_id, module_id) where is_first;
create index quiz_attempts_course_idx on public.quiz_attempts (course_id, student_id);
create index quiz_attempts_module_idx on public.quiz_attempts (module_id, course_id);
create index quiz_attempts_student_idx on public.quiz_attempts (student_id);

-- Failed join-code guesses, to slow down code guessing (join_class). Never read by clients.
create table public.join_attempts (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index join_attempts_user_idx on public.join_attempts (user_id, created_at);

-- Trim names on every write (the functions trim; direct renames must too).
create or replace function public.trim_class_names()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.name := trim(regexp_replace(new.name, '[[:cntrl:]]', '', 'g'));
  new.section := trim(regexp_replace(coalesce(new.section, ''), '[[:cntrl:]]', '', 'g'));
  return new;
end;
$$;

create trigger classes_trim_names
  before insert or update of name, section on public.classes
  for each row execute function public.trim_class_names();

-- A course may only be assigned to a class of the same teacher.
create or replace function public.check_assignment_teacher()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select teacher_id from public.courses where id = new.course_id)
     is distinct from (select teacher_id from public.classes where id = new.class_id) then
    raise exception 'course_and_class_teachers_differ' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger course_assignments_same_teacher
  before insert or update on public.course_assignments
  for each row execute function public.check_assignment_teacher();

-- ---------------------------------------------------------------------------
-- Helpers for policies (security definer so they read without recursing RLS)
-- ---------------------------------------------------------------------------
create or replace function public.is_approved_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'teacher' and status = 'approved'
  );
$$;

create or replace function public.teaches_class(p_class uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- Only an approved teacher: a teacher who is later rejected loses access.
  select public.is_approved_teacher()
     and exists (select 1 from public.classes where id = p_class and teacher_id = auth.uid());
$$;

create or replace function public.in_class(p_class uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.class_members where class_id = p_class and student_id = auth.uid());
$$;

create or replace function public.owns_course(p_course uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_approved_teacher()
     and exists (select 1 from public.courses where id = p_course and teacher_id = auth.uid());
$$;

-- Can the caller see this course? Its teacher, or a student in a class it's assigned to.
create or replace function public.can_see_course(p_course uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.owns_course(p_course)
      or exists (
        select 1 from public.course_assignments a
        join public.class_members m on m.class_id = a.class_id
        join public.courses c on c.id = a.course_id
        where a.course_id = p_course and m.student_id = auth.uid() and c.status = 'assigned'
      );
$$;


-- 5 characters from the no-look-alikes alphabet (no 0/O/1/I).
create or replace function public.new_join_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_code  text;
begin
  loop
    v_bytes := extensions.gen_random_bytes(5);
    v_code := '';
    for i in 0..4 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.classes where join_code = v_code);
  end loop;
  return v_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- Class functions
-- ---------------------------------------------------------------------------
create or replace function public.create_class(p_name text, p_section text default '')
returns public.classes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class public.classes;
begin
  if not public.is_approved_teacher() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  -- Two classes created at the same moment can draw the same code: try again.
  for attempt in 1..5 loop
    begin
      insert into public.classes (teacher_id, name, section, join_code)
      values (auth.uid(), trim(coalesce(p_name, '')), trim(coalesce(p_section, '')), public.new_join_code())
      returning * into v_class;
      return v_class;
    exception when unique_violation then
      if attempt = 5 then raise; end if;
    end;
  end loop;
  return v_class;
end;
$$;

create or replace function public.regenerate_join_code(p_class uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  if not (public.is_approved_teacher() and public.teaches_class(p_class)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  for attempt in 1..5 loop
    begin
      v_code := public.new_join_code();
      update public.classes set join_code = v_code where id = p_class;
      return v_code;
    exception when unique_violation then
      if attempt = 5 then raise; end if;
    end;
  end loop;
  return v_code;
end;
$$;

-- S1 Join (screen in stage 4). Students only; joining twice is a no-op.
-- Returns no row when the code matches no class of an approved teacher.
-- After 10 wrong codes in an hour it refuses (code guessing).
create or replace function public.join_class(p_code text)
returns table (class_id uuid, name text, section text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class public.classes;
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'student' and status = 'approved'
  ) then
    raise exception 'not_a_student' using errcode = '42501';
  end if;
  if (select count(*) from public.join_attempts
        where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'rate_limited' using errcode = '54000';
  end if;

  select c.* into v_class from public.classes c
    join public.profiles t on t.id = c.teacher_id and t.role = 'teacher' and t.status = 'approved'
    where c.join_code = public.normalize_invite_code(left(coalesce(p_code, ''), 20));
  if not found then
    insert into public.join_attempts (user_id) values (auth.uid());
    return;
  end if;

  insert into public.class_members (class_id, student_id) values (v_class.id, auth.uid())
    on conflict do nothing;
  return query select v_class.id, v_class.name, v_class.section;
end;
$$;

-- ---------------------------------------------------------------------------
-- Read helpers for the teacher screens. Security definer with the caller
-- checked first (approved teacher of the class), set-based so they stay fast
-- as classes grow, and returning only what the screens show (students' name
-- and email; teachers can't read the rest of a student's profile).
-- ---------------------------------------------------------------------------

-- T10 Class list: one row per class the caller teaches.
create or replace function public.teacher_class_summaries()
returns table (
  id uuid, name text, section text, join_code text, created_at timestamptz,
  student_count int, course_count int, overdue_students int
)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select c.* from public.classes c
    where c.teacher_id = auth.uid() and public.is_approved_teacher()
  ),
  members as (
    select m.class_id, count(*)::int as n from public.class_members m join mine on mine.id = m.class_id group by m.class_id
  ),
  assigned as (
    select a.class_id, count(*)::int as n from public.course_assignments a join mine on mine.id = a.class_id group by a.class_id
  ),
  module_totals as (
    select mo.course_id, count(*)::int as total from public.modules mo
    where mo.course_id in (select a.course_id from public.course_assignments a join mine on mine.id = a.class_id)
    group by mo.course_id
  ),
  done as (
    select p.course_id, p.student_id, count(*)::int as n from public.module_progress p
    where p.course_id in (select a.course_id from public.course_assignments a join mine on mine.id = a.class_id)
    group by p.course_id, p.student_id
  ),
  overdue as (
    select a.class_id, count(distinct m.student_id)::int as n
    from public.course_assignments a
    join mine on mine.id = a.class_id
    join public.class_members m on m.class_id = a.class_id
    left join module_totals t on t.course_id = a.course_id
    left join done d on d.course_id = a.course_id and d.student_id = m.student_id
    where a.due_date < current_date and coalesce(d.n, 0) < coalesce(t.total, 0)
    group by a.class_id
  )
  select c.id, c.name, c.section, c.join_code, c.created_at,
    coalesce(me.n, 0), coalesce(asg.n, 0), coalesce(o.n, 0)
  from mine c
  left join members me on me.class_id = c.id
  left join assigned asg on asg.class_id = c.id
  left join overdue o on o.class_id = c.id
  order by c.created_at;
$$;

-- T6 Class page: courses assigned to a class, with class-wide progress.
create or replace function public.class_course_stats(p_class uuid)
returns table (
  course_id uuid, title text, status public.course_status, due_date date, assigned_at timestamptz,
  module_count int, students_started int, students_complete int, students_overdue int
)
language sql
stable
security definer
set search_path = ''
as $$
  with allowed as (select public.teaches_class(p_class) as ok),
  courses as (
    select a.course_id, co.title, co.status, a.due_date, a.assigned_at,
      (select count(*)::int from public.modules mo where mo.course_id = a.course_id) as module_count
    from public.course_assignments a
    join public.courses co on co.id = a.course_id
    where a.class_id = p_class and (select ok from allowed)
  ),
  per_student as (
    select cr.course_id, m.student_id, count(p.module_id)::int as done
    from courses cr
    join public.class_members m on m.class_id = p_class
    left join public.module_progress p on p.course_id = cr.course_id and p.student_id = m.student_id
    group by cr.course_id, m.student_id
  )
  select cr.course_id, cr.title, cr.status, cr.due_date, cr.assigned_at, cr.module_count,
    count(*) filter (where ps.done > 0)::int,
    count(*) filter (where cr.module_count > 0 and ps.done >= cr.module_count)::int,
    count(*) filter (where cr.due_date < current_date and ps.done < cr.module_count)::int
  from courses cr
  left join per_student ps on ps.course_id = cr.course_id
  group by cr.course_id, cr.title, cr.status, cr.due_date, cr.assigned_at, cr.module_count
  order by cr.assigned_at desc;
$$;

-- T11 Roster / T12 panel: students in a class with progress on one of its courses (or none).
create or replace function public.class_roster(p_class uuid, p_course uuid default null)
returns table (
  student_id uuid, full_name text, email text, joined_at timestamptz,
  modules_done int, quiz_first_correct int, quiz_first_total int
)
language sql
stable
security definer
set search_path = ''
as $$
  with allowed as (
    select public.teaches_class(p_class)
       and (p_course is null or exists (
             select 1 from public.course_assignments a where a.class_id = p_class and a.course_id = p_course)) as ok
  ),
  done as (
    select mp.student_id, count(*)::int as n from public.module_progress mp
    where mp.course_id = p_course group by mp.student_id
  ),
  quiz as (
    select q.student_id, count(*) filter (where q.is_correct)::int as right_n, count(*)::int as total
    from public.quiz_attempts q where q.course_id = p_course and q.is_first group by q.student_id
  )
  select m.student_id, p.full_name, p.email, m.joined_at,
    coalesce(d.n, 0), coalesce(qz.right_n, 0), coalesce(qz.total, 0)
  from public.class_members m
  join public.profiles p on p.id = m.student_id
  left join done d on d.student_id = m.student_id
  left join quiz qz on qz.student_id = m.student_id
  where m.class_id = p_class and (select ok from allowed)
  order by p.full_name, p.email;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_reads enable row level security;
alter table public.courses enable row level security;
alter table public.course_assignments enable row level security;
alter table public.modules enable row level security;
alter table public.module_progress enable row level security;
alter table public.quiz_attempts enable row level security;

-- profiles: unchanged (self and admins). Teachers get their students' name
-- and email through class_roster() only.
alter table public.join_attempts enable row level security;

create policy "classes: teacher or member reads" on public.classes
  for select to authenticated
  using ((teacher_id = (select auth.uid()) and (select public.is_approved_teacher())) or public.in_class(id));
create policy "classes: approved owner updates" on public.classes
  for update to authenticated
  using (teacher_id = (select auth.uid()) and (select public.is_approved_teacher()))
  with check (teacher_id = (select auth.uid()));
create policy "classes: approved owner deletes" on public.classes
  for delete to authenticated
  using (teacher_id = (select auth.uid()) and (select public.is_approved_teacher()));

create policy "members: teacher or self reads" on public.class_members
  for select to authenticated
  using (student_id = (select auth.uid()) or public.teaches_class(class_id));
create policy "members: teacher removes, student leaves" on public.class_members
  for delete to authenticated
  using (student_id = (select auth.uid()) or public.teaches_class(class_id));

create policy "announcements: teacher or member reads" on public.announcements
  for select to authenticated
  using (public.teaches_class(class_id) or public.in_class(class_id));
create policy "announcements: approved teacher posts" on public.announcements
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (select public.is_approved_teacher())
    and public.teaches_class(class_id)
  );
create policy "announcements: teacher deletes" on public.announcements
  for delete to authenticated
  using (public.teaches_class(class_id));

create policy "reads: student or teacher reads" on public.announcement_reads
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or exists (select 1 from public.announcements a where a.id = announcement_id and public.teaches_class(a.class_id))
  );
create policy "reads: member marks seen" on public.announcement_reads
  for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (select 1 from public.announcements a where a.id = announcement_id and public.in_class(a.class_id))
  );

create policy "courses: owner or assigned student reads" on public.courses
  for select to authenticated
  using (public.can_see_course(id));

create policy "assignments: teacher or member reads" on public.course_assignments
  for select to authenticated
  using (public.teaches_class(class_id) or public.in_class(class_id) or public.owns_course(course_id));

create policy "modules: whoever sees the course reads" on public.modules
  for select to authenticated
  using (public.can_see_course(course_id));

create policy "progress: student or course owner reads" on public.module_progress
  for select to authenticated
  using (student_id = (select auth.uid()) or public.owns_course(course_id));

create policy "attempts: student or course owner reads" on public.quiz_attempts
  for select to authenticated
  using (student_id = (select auth.uid()) or public.owns_course(course_id));

-- ---------------------------------------------------------------------------
-- Grants: nothing for anon; reads plus the few writes above for signed-in users
-- ---------------------------------------------------------------------------
revoke all on public.classes, public.class_members, public.announcements, public.announcement_reads,
  public.courses, public.course_assignments, public.modules, public.module_progress, public.quiz_attempts
  from anon, authenticated;

grant select on public.classes, public.class_members, public.announcements, public.announcement_reads,
  public.courses, public.course_assignments, public.modules, public.module_progress, public.quiz_attempts
  to authenticated;
grant update (name, section) on public.classes to authenticated;
grant delete on public.classes, public.class_members, public.announcements to authenticated;
grant insert (class_id, body) on public.announcements to authenticated;
grant insert (announcement_id) on public.announcement_reads to authenticated;

revoke execute on function public.is_approved_teacher() from public, anon;
revoke execute on function public.teaches_class(uuid) from public, anon;
revoke execute on function public.in_class(uuid) from public, anon;
revoke all on public.join_attempts from anon, authenticated;
revoke execute on function public.trim_class_names() from public, anon, authenticated;
revoke execute on function public.check_assignment_teacher() from public, anon, authenticated;
revoke execute on function public.can_see_course(uuid) from public, anon;
revoke execute on function public.owns_course(uuid) from public, anon;
revoke execute on function public.new_join_code() from public, anon, authenticated;
revoke execute on function public.create_class(text, text) from public, anon;
revoke execute on function public.regenerate_join_code(uuid) from public, anon;
revoke execute on function public.join_class(text) from public, anon;
revoke execute on function public.teacher_class_summaries() from public, anon;
revoke execute on function public.class_course_stats(uuid) from public, anon;
revoke execute on function public.class_roster(uuid, uuid) from public, anon;

grant execute on function public.is_approved_teacher() to authenticated;
grant execute on function public.teaches_class(uuid) to authenticated;
grant execute on function public.in_class(uuid) to authenticated;
grant execute on function public.can_see_course(uuid) to authenticated;
grant execute on function public.owns_course(uuid) to authenticated;
grant execute on function public.create_class(text, text) to authenticated;
grant execute on function public.regenerate_join_code(uuid) to authenticated;
grant execute on function public.join_class(text) to authenticated;
grant execute on function public.teacher_class_summaries() to authenticated;
grant execute on function public.class_course_stats(uuid) to authenticated;
grant execute on function public.class_roster(uuid, uuid) to authenticated;
