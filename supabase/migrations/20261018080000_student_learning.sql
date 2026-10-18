-- Stage 4 · Student screens: quiz answers kept on the server, recording
-- progress and quiz attempts, and the reads the student screens need.
-- See docs/schema.md.
--
-- Security model
-- * Quiz answers live in quiz_answers, which students can never read; they
--   learn the answer only after answering, through answer_quiz().
-- * Students write progress and attempts only through the functions below,
--   which check they can see the course (assigned to one of their classes).
-- * Read functions return only what the screens show (the teacher's name, not
--   their profile).

-- ---------------------------------------------------------------------------
-- modules.quiz holds the question and options only. The database enforces it,
-- so a generator that copies an "answer" key into the quiz can't leak it.
-- ---------------------------------------------------------------------------
alter table public.modules add constraint modules_quiz_shape check (
  quiz is null or (
    jsonb_typeof(quiz) = 'object'
    and quiz - 'question' - 'options' = '{}'::jsonb
    and jsonb_typeof(quiz -> 'question') = 'string'
    and jsonb_typeof(quiz -> 'options') = 'array'
    and jsonb_array_length(quiz -> 'options') between 2 and 10
  )
);

-- Students see a course's assignment (due date) only while the course is assigned.
alter policy "assignments: teacher or member reads" on public.course_assignments
  using (
    public.teaches_class(class_id)
    or public.owns_course(course_id)
    or (public.in_class(class_id) and public.can_see_course(course_id))
  );

-- ---------------------------------------------------------------------------
-- quiz_answers: the right option and why, per module (teacher-only)
-- ---------------------------------------------------------------------------
create table public.quiz_answers (
  module_id    uuid primary key references public.modules (id) on delete cascade,
  answer_index int not null check (answer_index between 0 and 9),
  explanation  text not null default '' check (char_length(explanation) <= 600)
);
comment on table public.quiz_answers is 'Correct option per module quiz. Never readable by students; answer_quiz() reveals it after an answer.';

alter table public.quiz_answers enable row level security;

create policy "quiz answers: course owner reads" on public.quiz_answers
  for select to authenticated
  using (exists (select 1 from public.modules m where m.id = module_id and public.owns_course(m.course_id)));

revoke all on public.quiz_answers from anon, authenticated;
grant select on public.quiz_answers to authenticated;

-- ---------------------------------------------------------------------------
-- Helper: is the caller an approved student who can see this course?
-- ---------------------------------------------------------------------------
create or replace function public.studies_course(p_course uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student' and p.status = 'approved'
  ) and exists (
    select 1 from public.course_assignments a
    join public.class_members m on m.class_id = a.class_id
    join public.courses c on c.id = a.course_id
    join public.profiles t on t.id = c.teacher_id and t.status = 'approved'
    where a.course_id = p_course and m.student_id = auth.uid() and c.status = 'assigned'
  );
$$;

-- ---------------------------------------------------------------------------
-- S4 Quick check: record an answer and reveal the right one.
-- The first answer per module counts (is_first); later ones are recorded too
-- but never change the score (decision #6).
-- ---------------------------------------------------------------------------
create or replace function public.answer_quiz(p_module uuid, p_choice int)
returns table (is_correct boolean, answer_index int, explanation text, first_try boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_module  public.modules;
  v_answer  public.quiz_answers;
  v_options int;
  v_first   boolean;
  v_correct boolean;
begin
  select * into v_module from public.modules where id = p_module;
  if not found or not public.studies_course(v_module.course_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select * into v_answer from public.quiz_answers where module_id = p_module;
  v_options := coalesce(jsonb_array_length(v_module.quiz -> 'options'), 0);
  if v_module.quiz is null or v_answer.module_id is null or v_options = 0 then
    raise exception 'no_quiz' using errcode = 'P0002';
  end if;
  if p_choice is null or p_choice < 0 or p_choice >= v_options then
    raise exception 'invalid_choice' using errcode = '22023';
  end if;

  if v_answer.answer_index >= v_options then
    raise exception 'no_quiz' using errcode = 'P0002'; -- answer points past the options: treat as no quiz
  end if;

  v_correct := p_choice = v_answer.answer_index;
  -- Lock the student's attempts on this module so two quick taps can't both be "first".
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || p_module::text, 0));
  v_first := not exists (
    select 1 from public.quiz_attempts q where q.student_id = auth.uid() and q.module_id = p_module
  );
  -- Retries are shown but never scored; cap them so a script can't fill the table.
  if (select count(*) from public.quiz_attempts q where q.student_id = auth.uid() and q.module_id = p_module) >= 20 then
    raise exception 'too_many_attempts' using errcode = '54000';
  end if;

  insert into public.quiz_attempts (student_id, module_id, course_id, chosen_index, is_correct, is_first)
  values (auth.uid(), p_module, v_module.course_id, p_choice, v_correct, v_first);

  return query select v_correct, v_answer.answer_index, v_answer.explanation, v_first;
end;
$$;

-- The student's own first answer for a module, so S4 can show it again on revisit.
create or replace function public.my_quiz_result(p_module uuid)
returns table (chosen_index int, is_correct boolean, answer_index int, explanation text)
language sql
stable
security definer
set search_path = ''
as $$
  select q.chosen_index, q.is_correct, a.answer_index, a.explanation
  from public.quiz_attempts q
  join public.modules m on m.id = q.module_id
  join public.quiz_answers a on a.module_id = q.module_id
  where q.module_id = p_module and q.student_id = auth.uid() and q.is_first
    and public.studies_course(m.course_id);
$$;

-- ---------------------------------------------------------------------------
-- S3/S4 "Complete & next": record a finished module (idempotent).
-- Returns modules done and total for the course.
-- ---------------------------------------------------------------------------
create or replace function public.complete_module(p_module uuid)
returns table (course_id uuid, done int, total int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course uuid;
  v_quiz   jsonb;
begin
  select m.course_id, m.quiz into v_course, v_quiz from public.modules m where m.id = p_module;
  if v_course is null or not public.studies_course(v_course) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  -- The quick check is the module's last step (decision #48).
  if v_quiz is not null and not exists (
    select 1 from public.quiz_attempts q where q.module_id = p_module and q.student_id = auth.uid() and q.is_first
  ) then
    raise exception 'quiz_first' using errcode = '22023';
  end if;
  insert into public.module_progress (student_id, module_id, course_id)
  values (auth.uid(), p_module, v_course)
  on conflict (student_id, module_id) do nothing;
  return query
    select v_course,
           (select count(*)::int from public.module_progress p where p.student_id = auth.uid() and p.course_id = v_course),
           (select count(*)::int from public.modules m where m.course_id = v_course);
end;
$$;

-- ---------------------------------------------------------------------------
-- Reads for the student screens (caller's own data only)
-- ---------------------------------------------------------------------------

-- S7 Classes / Account: the caller's classes with the teacher's name.
create or replace function public.student_classes()
returns table (class_id uuid, name text, section text, teacher_name text, joined_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.section, t.full_name, m.joined_at
  from public.class_members m
  join public.classes c on c.id = m.class_id
  join public.profiles t on t.id = c.teacher_id
  where m.student_id = auth.uid()
  order by c.name, c.section;
$$;

-- S2 Home / S7 / S8: assigned courses with the caller's progress. One row per
-- (course, class) so a course in two of the student's classes shows its class.
create or replace function public.student_courses()
returns table (
  course_id uuid, title text, content_locale text, class_id uuid, class_name text, due_date date,
  module_count int, modules_done int, quiz_correct int, quiz_answered int, last_done_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select a.course_id, a.class_id, a.due_date
    from public.course_assignments a
    join public.class_members m on m.class_id = a.class_id and m.student_id = auth.uid()
    join public.courses c on c.id = a.course_id and c.status = 'assigned'
    -- Same rule as answering and completing: approved student, approved teacher.
    where public.studies_course(a.course_id)
  ),
  totals as (
    select mo.course_id, count(*)::int as n from public.modules mo
    where mo.course_id in (select course_id from mine) group by mo.course_id
  ),
  done as (
    select p.course_id, count(*)::int as n, max(p.completed_at) as last_at from public.module_progress p
    where p.student_id = auth.uid() and p.course_id in (select course_id from mine) group by p.course_id
  ),
  quiz as (
    select q.course_id, count(*) filter (where q.is_correct)::int as right_n, count(*)::int as n
    from public.quiz_attempts q
    where q.student_id = auth.uid() and q.is_first and q.course_id in (select course_id from mine)
    group by q.course_id
  )
  select c.id, c.title, c.content_locale, mi.class_id, cl.name, mi.due_date,
    coalesce(t.n, 0), coalesce(d.n, 0), coalesce(q.right_n, 0), coalesce(q.n, 0), d.last_at
  from mine mi
  join public.courses c on c.id = mi.course_id
  join public.classes cl on cl.id = mi.class_id
  left join totals t on t.course_id = c.id
  left join done d on d.course_id = c.id
  left join quiz q on q.course_id = c.id
  order by mi.due_date nulls last, c.title;
$$;

-- S8 / S3: the caller's done modules and first quiz answers for one course.
create or replace function public.student_course_modules(p_course uuid)
returns table (module_id uuid, "position" int, heading text, done boolean, quiz_correct boolean, has_quiz boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.position, m.heading,
    exists (select 1 from public.module_progress p where p.module_id = m.id and p.student_id = auth.uid()),
    (select q.is_correct from public.quiz_attempts q where q.module_id = m.id and q.student_id = auth.uid() and q.is_first),
    m.quiz is not null
  from public.modules m
  where m.course_id = p_course and public.studies_course(p_course)
  order by m.position;
$$;

-- S2 / S7: announcements from the caller's classes with teacher and class names.
create or replace function public.student_announcements(p_class uuid default null, p_limit int default 20)
returns table (id uuid, class_id uuid, class_name text, teacher_name text, body text, created_at timestamptz, seen boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.class_id, c.name, t.full_name, a.body, a.created_at,
    exists (select 1 from public.announcement_reads r where r.announcement_id = a.id and r.student_id = auth.uid())
  from public.announcements a
  join public.class_members m on m.class_id = a.class_id and m.student_id = auth.uid()
  join public.classes c on c.id = a.class_id
  join public.profiles t on t.id = a.author_id
  where (p_class is null or a.class_id = p_class)
  order by a.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

-- S2 / S7: mark announcements seen. Ids outside the student's classes are skipped.
create or replace function public.mark_announcements_seen(p_ids uuid[])
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.announcement_reads (announcement_id, student_id)
  select a.id, auth.uid()
  from public.announcements a
  join public.class_members m on m.class_id = a.class_id and m.student_id = auth.uid()
  where a.id = any (p_ids[1:50])
  on conflict do nothing;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke execute on function public.studies_course(uuid) from public, anon, authenticated;
revoke execute on function public.mark_announcements_seen(uuid[]) from public, anon;
revoke execute on function public.answer_quiz(uuid, int) from public, anon;
revoke execute on function public.my_quiz_result(uuid) from public, anon;
revoke execute on function public.complete_module(uuid) from public, anon;
revoke execute on function public.student_classes() from public, anon;
revoke execute on function public.student_courses() from public, anon;
revoke execute on function public.student_course_modules(uuid) from public, anon;
revoke execute on function public.student_announcements(uuid, int) from public, anon;

grant execute on function public.mark_announcements_seen(uuid[]) to authenticated;
grant execute on function public.answer_quiz(uuid, int) to authenticated;
grant execute on function public.my_quiz_result(uuid) to authenticated;
grant execute on function public.complete_module(uuid) to authenticated;
grant execute on function public.student_classes() to authenticated;
grant execute on function public.student_courses() to authenticated;
grant execute on function public.student_course_modules(uuid) to authenticated;
grant execute on function public.student_announcements(uuid, int) to authenticated;
