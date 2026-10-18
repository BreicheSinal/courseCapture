-- Stage 5 · Course generation: background jobs, AI usage limits, the private
-- sources bucket, and the teacher's write paths for courses, modules and
-- assignments. See docs/schema.md and docs/ai.md.
--
-- Security model
-- * Teachers create, rename and delete their own courses directly (RLS +
--   column grants). Everything else a teacher changes goes through the
--   functions below, which check the caller owns the course first.
-- * Generated content (modules, quiz answers, diagrams) and job progress are
--   written by server code with the service role, never by the browser.
-- * ai_usage is written only by the service role; teachers read their own rows.

-- ---------------------------------------------------------------------------
-- Module review state (T3/T4: "Check", "Checked")
-- ---------------------------------------------------------------------------
alter table public.modules
  add column review_note text check (char_length(review_note) <= 200),
  add column checked_at timestamptz;
comment on column public.modules.review_note is 'Why Claude (or the basic splitter) thinks the teacher should check this module; null when nothing to flag.';
comment on column public.modules.checked_at is 'When the teacher marked the module as checked (T4).';

alter table public.modules
  add constraint modules_flashcards_shape check (jsonb_typeof(flashcards) = 'array' and jsonb_array_length(flashcards) <= 8);

-- Reordering swaps two positions inside one statement; let the uniqueness
-- check wait until the end of the transaction.
alter table public.modules drop constraint modules_course_id_position_key;
alter table public.modules
  add constraint modules_course_id_position_key unique (course_id, position) deferrable initially immediate;

-- ---------------------------------------------------------------------------
-- generation_jobs: one row per "Generate course" (drives T2)
-- ---------------------------------------------------------------------------
create type public.job_step as enum ('queued', 'reading', 'writing', 'drawing', 'done', 'failed');

create table public.generation_jobs (
  id             uuid primary key default gen_random_uuid(),
  course_id      uuid not null references public.courses (id) on delete cascade,
  teacher_id     uuid not null references public.profiles (id) on delete cascade,
  step           public.job_step not null default 'queued',
  source_kind    text not null check (source_kind in ('pdf', 'pptx', 'text', 'paste')),
  source_path    text check (char_length(source_path) <= 400),   -- object in the sources bucket; null once deleted
  notes          text not null default '' check (char_length(notes) <= 500),
  pages_total    int check (pages_total >= 0),
  pages_scanned  int check (pages_scanned >= 0),
  chunks_total   int not null default 0 check (chunks_total between 0 and 4),
  chunks_done    int not null default 0 check (chunks_done >= 0),
  modules_total  int not null default 0 check (modules_total >= 0),
  modules_drawn  int not null default 0 check (modules_drawn >= 0),
  fallback_chunks int not null default 0 check (fallback_chunks >= 0),
  error          text check (char_length(error) <= 60),             -- a key the screen translates (teacher.generating.errors.*)
  created_at     timestamptz not null default now(),
  started_at     timestamptz,
  finished_at    timestamptz
);
comment on table public.generation_jobs is 'Course generation progress for T2. Written by server code (service role); the owning teacher reads it.';
create index generation_jobs_course_idx on public.generation_jobs (course_id, created_at desc);
create index generation_jobs_teacher_idx on public.generation_jobs (teacher_id, created_at);
-- One running job per course.
create unique index generation_jobs_one_active_idx on public.generation_jobs (course_id)
  where step not in ('done', 'failed');

-- ---------------------------------------------------------------------------
-- ai_usage: one row per AI action a person takes (cost limits, decision #27)
-- ---------------------------------------------------------------------------
create table public.ai_usage (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  kind          text not null check (kind in ('generate', 'redraw', 'tutor')),
  provider      text not null default '' check (char_length(provider) <= 40),
  model         text not null default '' check (char_length(model) <= 120),
  input_tokens  int not null default 0 check (input_tokens >= 0),
  output_tokens int not null default 0 check (output_tokens >= 0),
  created_at    timestamptz not null default now()
);
comment on table public.ai_usage is 'One row per counted AI action (a generation, a diagram redraw, a tutor question), with the tokens it used. Service role writes.';
create index ai_usage_user_day_idx on public.ai_usage (user_id, kind, created_at);

-- Claims one use of `kind` for `user` today (UTC), or raises daily_limit.
-- Service role only: the app calls it before every counted AI action.
create or replace function public.claim_ai_use(p_user uuid, p_kind text, p_limit int, p_provider text, p_model text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  -- Serialise claims per person and kind so two quick clicks can't both slip under the limit.
  perform pg_advisory_xact_lock(hashtextextended('ai_use:' || p_user::text || ':' || p_kind, 0));
  if p_limit is not null and (
    select count(*) from public.ai_usage u
    where u.user_id = p_user and u.kind = p_kind and u.created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc'
  ) >= p_limit then
    raise exception 'daily_limit' using errcode = '54000';
  end if;
  insert into public.ai_usage (user_id, kind, provider, model)
  values (p_user, p_kind, left(coalesce(p_provider, ''), 40), left(coalesce(p_model, ''), 120))
  returning id into v_id;
  return v_id;
end;
$$;

-- Adds the tokens of one model call to a claimed use.
create or replace function public.add_ai_tokens(p_use bigint, p_input int, p_output int)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ai_usage
  set input_tokens = input_tokens + greatest(coalesce(p_input, 0), 0),
      output_tokens = output_tokens + greatest(coalesce(p_output, 0), 0)
  where id = p_use;
$$;

-- What the caller has used today, for "n of 20 left" hints.
create or replace function public.my_ai_usage_today()
returns table (kind text, used int)
language sql
stable
security definer
set search_path = ''
as $$
  select u.kind, count(*)::int
  from public.ai_usage u
  where u.user_id = auth.uid() and u.created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc'
  group by u.kind;
$$;

-- ---------------------------------------------------------------------------
-- Courses: approved teachers create, rename and delete their own
-- ---------------------------------------------------------------------------
create policy "courses: approved teacher creates own drafts" on public.courses
  for insert to authenticated
  with check (teacher_id = (select auth.uid()) and status = 'draft' and (select public.is_approved_teacher()));
create policy "courses: owner updates" on public.courses
  for update to authenticated
  using (public.owns_course(id))
  with check (teacher_id = (select auth.uid()));
create policy "courses: owner deletes" on public.courses
  for delete to authenticated
  using (public.owns_course(id));

-- INSERT … RETURNING checks the read policy against the new row, which
-- can_see_course() can't see yet; compare the owner column directly too.
alter policy "courses: owner or assigned student reads" on public.courses
  using ((teacher_id = (select auth.uid()) and (select public.is_approved_teacher())) or public.can_see_course(id));

grant insert (teacher_id, title, content_locale, level, source_name) on public.courses to authenticated;
grant update (title, content_locale, level) on public.courses to authenticated;
grant delete on public.courses to authenticated;

-- Trim titles on every write.
create or replace function public.trim_course_title()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.title := trim(regexp_replace(new.title, '[[:cntrl:]]', ' ', 'g'));
  return new;
end;
$$;
create trigger courses_trim_title
  before insert or update of title on public.courses
  for each row execute function public.trim_course_title();

-- ---------------------------------------------------------------------------
-- generation_jobs and ai_usage: read-only to their owner
-- ---------------------------------------------------------------------------
alter table public.generation_jobs enable row level security;
alter table public.ai_usage enable row level security;

create policy "jobs: course owner reads" on public.generation_jobs
  for select to authenticated
  using (teacher_id = (select auth.uid()) and public.owns_course(course_id));

create policy "usage: self reads" on public.ai_usage
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Module edits (T3, T4). All check that the caller owns the course.
-- ---------------------------------------------------------------------------

-- Which course a module belongs to, if the caller owns it; raises otherwise.
create or replace function public.owned_module_course(p_module uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_course uuid;
begin
  select m.course_id into v_course from public.modules m where m.id = p_module;
  if v_course is null or not public.owns_course(v_course) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return v_course;
end;
$$;

-- T4 "Save": everything on the edit screen except the diagram picture, in one transaction.
create or replace function public.save_module(
  p_module      uuid,
  p_heading     text,
  p_body        text,
  p_key_points  text[],
  p_flashcards  jsonb,
  p_quiz        jsonb,
  p_answer_index int,
  p_explanation text,
  p_caption     text,
  p_alt         text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course  uuid := public.owned_module_course(p_module);
  v_heading text := trim(coalesce(p_heading, ''));
  v_points  text[];
  v_cards   jsonb;
  v_quiz    jsonb;
  v_n       int;
begin
  if char_length(v_heading) not between 1 and 120 then
    raise exception 'invalid_heading' using errcode = '22023';
  end if;
  if char_length(coalesce(p_body, '')) > 2000 then
    raise exception 'invalid_body' using errcode = '22023';
  end if;

  select coalesce(array_agg(trim(k) order by o), '{}') into v_points
  from unnest(coalesce(p_key_points, '{}')) with ordinality as t(k, o)
  where trim(k) <> '';
  if cardinality(v_points) > 8 or exists (select 1 from unnest(v_points) k where char_length(k) > 300) then
    raise exception 'invalid_key_points' using errcode = '22023';
  end if;

  if p_flashcards is null or jsonb_typeof(p_flashcards) <> 'array' or jsonb_array_length(p_flashcards) > 8 then
    raise exception 'invalid_flashcards' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_flashcards) c
    where jsonb_typeof(c) <> 'object' or jsonb_typeof(c -> 'q') <> 'string' or jsonb_typeof(c -> 'a') <> 'string'
       or char_length(c ->> 'q') > 300 or char_length(c ->> 'a') > 300
  ) then
    raise exception 'invalid_flashcards' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('q', trim(c ->> 'q'), 'a', trim(c ->> 'a')) order by o), '[]'::jsonb) into v_cards
  from jsonb_array_elements(p_flashcards) with ordinality as t(c, o)
  where trim(c ->> 'q') <> '' and trim(c ->> 'a') <> '';

  if p_quiz is null then
    v_quiz := null;
  else
    if jsonb_typeof(p_quiz) <> 'object' or jsonb_typeof(p_quiz -> 'question') <> 'string'
       or jsonb_typeof(p_quiz -> 'options') <> 'array' then
      raise exception 'invalid_quiz' using errcode = '22023';
    end if;
    v_n := jsonb_array_length(p_quiz -> 'options');
    if char_length(trim(p_quiz ->> 'question')) not between 1 and 300 or v_n not between 2 and 10
       or exists (
         select 1 from jsonb_array_elements(p_quiz -> 'options') o
         where jsonb_typeof(o) <> 'string' or char_length(trim(o #>> '{}')) not between 1 and 200
       ) then
      raise exception 'invalid_quiz' using errcode = '22023';
    end if;
    if p_answer_index is null or p_answer_index < 0 or p_answer_index >= v_n then
      raise exception 'invalid_answer' using errcode = '22023';
    end if;
    if char_length(coalesce(p_explanation, '')) > 600 then
      raise exception 'invalid_explanation' using errcode = '22023';
    end if;
    v_quiz := jsonb_build_object(
      'question', trim(p_quiz ->> 'question'),
      'options', (select jsonb_agg(to_jsonb(trim(o #>> '{}')) order by i) from jsonb_array_elements(p_quiz -> 'options') with ordinality as t(o, i))
    );
  end if;

  if char_length(coalesce(p_caption, '')) > 200 or char_length(coalesce(p_alt, '')) > 400 then
    raise exception 'invalid_visual_text' using errcode = '22023';
  end if;
  if exists (select 1 from public.modules m where m.id = p_module and m.visual_svg is not null)
     and trim(coalesce(p_alt, '')) = '' then
    raise exception 'alt_required' using errcode = '22023';
  end if;

  update public.modules
  set heading = v_heading,
      body = trim(coalesce(p_body, '')),
      key_points = v_points,
      flashcards = v_cards,
      quiz = v_quiz,
      visual_caption = nullif(trim(coalesce(p_caption, '')), ''),
      visual_alt = nullif(trim(coalesce(p_alt, '')), '')
  where id = p_module;

  if v_quiz is null then
    delete from public.quiz_answers where module_id = p_module;
  else
    insert into public.quiz_answers (module_id, answer_index, explanation)
    values (p_module, p_answer_index, trim(coalesce(p_explanation, '')))
    on conflict (module_id) do update set answer_index = excluded.answer_index, explanation = excluded.explanation;
  end if;

  update public.courses set updated_at = now() where id = v_course;
end;
$$;

-- T4 "Mark as checked" (and undo).
create or replace function public.set_module_checked(p_module uuid, p_checked boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course uuid := public.owned_module_course(p_module);
begin
  update public.modules
  set checked_at = case when p_checked then now() end,
      review_note = case when p_checked then null else review_note end
  where id = p_module;
  update public.courses set updated_at = now() where id = v_course;
end;
$$;

-- T4 "Remove diagram".
create or replace function public.clear_module_visual(p_module uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course uuid := public.owned_module_course(p_module);
begin
  update public.modules set visual_svg = null, visual_caption = null, visual_alt = null where id = p_module;
  update public.courses set updated_at = now() where id = v_course;
end;
$$;

-- T3 "Move up" / "Move down": swaps the module with its neighbour. Returns its new position.
create or replace function public.move_module(p_module uuid, p_offset int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course uuid := public.owned_module_course(p_module);
  v_pos    int;
  v_target int;
  v_other  uuid;
begin
  if p_offset not in (-1, 1) then
    raise exception 'invalid_offset' using errcode = '22023';
  end if;
  perform 1 from public.modules where course_id = v_course for update;
  select position into v_pos from public.modules where id = p_module;
  v_target := v_pos + p_offset;
  select id into v_other from public.modules where course_id = v_course and position = v_target;
  if v_other is null then
    return v_pos; -- already first or last
  end if;
  set constraints public.modules_course_id_position_key deferred;
  update public.modules set position = v_target where id = p_module;
  update public.modules set position = v_pos where id = v_other;
  update public.courses set updated_at = now() where id = v_course;
  return v_target;
end;
$$;

-- T4 "Delete module": removes it and closes the gap in positions. A course keeps at least one module.
create or replace function public.delete_module(p_module uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course uuid := public.owned_module_course(p_module);
  v_pos    int;
begin
  perform 1 from public.modules where course_id = v_course for update;
  if (select count(*) from public.modules where course_id = v_course) <= 1 then
    raise exception 'last_module' using errcode = '22023';
  end if;
  delete from public.modules where id = p_module returning position into v_pos;
  set constraints public.modules_course_id_position_key deferred;
  update public.modules set position = position - 1 where course_id = v_course and position > v_pos;
  update public.courses set updated_at = now() where id = v_course;
end;
$$;

-- ---------------------------------------------------------------------------
-- Assignments (T5): one course, many classes, each with its own due date (#28)
-- ---------------------------------------------------------------------------

-- Assigns (or changes the due date for) one class. The course must be finished and have modules.
create or replace function public.assign_course(p_course uuid, p_class uuid, p_due date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.owns_course(p_course) or not public.teaches_class(p_class) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  perform 1 from public.courses where id = p_course for update;
  if exists (select 1 from public.generation_jobs j where j.course_id = p_course and j.step not in ('done', 'failed')) then
    raise exception 'still_generating' using errcode = '55000';
  end if;
  if not exists (select 1 from public.modules m where m.course_id = p_course) then
    raise exception 'no_modules' using errcode = '22023';
  end if;
  -- A new date can't be in the past (one day's slack for time zones); an unchanged one may be.
  if p_due is not null and (p_due < current_date - 1 or p_due > current_date + 730)
     and p_due is distinct from (select a.due_date from public.course_assignments a where a.course_id = p_course and a.class_id = p_class) then
    raise exception 'invalid_due_date' using errcode = '22023';
  end if;

  insert into public.course_assignments (course_id, class_id, due_date)
  values (p_course, p_class, p_due)
  on conflict (course_id, class_id) do update set due_date = excluded.due_date;

  update public.courses
  set status = 'assigned', assigned_at = coalesce(assigned_at, now())
  where id = p_course and status <> 'assigned';
end;
$$;

-- Takes a course off one class. With no classes left it goes back to draft.
create or replace function public.unassign_course(p_course uuid, p_class uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.owns_course(p_course) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  perform 1 from public.courses where id = p_course for update;
  delete from public.course_assignments where course_id = p_course and class_id = p_class;
  if not exists (select 1 from public.course_assignments where course_id = p_course) then
    update public.courses set status = 'draft', assigned_at = null where id = p_course;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Private bucket for uploaded sources (Supabase Storage). Uploads use signed
-- upload URLs made by the server; only the service role reads or deletes, so
-- there are no storage policies for clients. Skipped where Storage isn't
-- installed (the plain-Postgres test database).
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'sources', 'sources', false, 20971520,
      array[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain', 'text/markdown', 'application/octet-stream'
      ]
    )
    on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on public.generation_jobs, public.ai_usage from anon, authenticated;
grant select on public.generation_jobs, public.ai_usage to authenticated;

revoke execute on function public.claim_ai_use(uuid, text, int, text, text) from public, anon, authenticated;
revoke execute on function public.add_ai_tokens(bigint, int, int) from public, anon, authenticated;
revoke execute on function public.owned_module_course(uuid) from public, anon, authenticated;
revoke execute on function public.trim_course_title() from public, anon, authenticated;
revoke execute on function public.my_ai_usage_today() from public, anon;
revoke execute on function public.save_module(uuid, text, text, text[], jsonb, jsonb, int, text, text, text) from public, anon;
revoke execute on function public.set_module_checked(uuid, boolean) from public, anon;
revoke execute on function public.clear_module_visual(uuid) from public, anon;
revoke execute on function public.move_module(uuid, int) from public, anon;
revoke execute on function public.delete_module(uuid) from public, anon;
revoke execute on function public.assign_course(uuid, uuid, date) from public, anon;
revoke execute on function public.unassign_course(uuid, uuid) from public, anon;

grant execute on function public.claim_ai_use(uuid, text, int, text, text) to service_role;
grant execute on function public.add_ai_tokens(bigint, int, int) to service_role;
grant execute on function public.my_ai_usage_today() to authenticated;
grant execute on function public.save_module(uuid, text, text, text[], jsonb, jsonb, int, text, text, text) to authenticated;
grant execute on function public.set_module_checked(uuid, boolean) to authenticated;
grant execute on function public.clear_module_visual(uuid) to authenticated;
grant execute on function public.move_module(uuid, int) to authenticated;
grant execute on function public.delete_module(uuid) to authenticated;
grant execute on function public.assign_course(uuid, uuid, date) to authenticated;
grant execute on function public.unassign_course(uuid, uuid) to authenticated;
