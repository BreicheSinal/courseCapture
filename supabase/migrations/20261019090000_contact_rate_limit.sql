-- Contact form rate limit (#59).
-- The form stores nothing about the message. To stop floods it records, per
-- sender, only a salted hash of the IP address and the time, and old rows are
-- removed on the next claim. Only the server (service role) can call it.

create table public.contact_attempts (
  id bigint generated always as identity primary key,
  sender_hash text not null check (char_length(sender_hash) between 32 and 128),
  created_at timestamptz not null default now()
);

create index contact_attempts_sender_time on public.contact_attempts (sender_hash, created_at);

-- No client access at all: RLS on, no policies, no grants.
alter table public.contact_attempts enable row level security;
revoke all on public.contact_attempts from public, anon, authenticated;
revoke all on sequence public.contact_attempts_id_seq from public, anon, authenticated;

-- Records one attempt for the sender unless they already have p_limit within
-- p_window. Returns true when the message may be sent.
create or replace function public.claim_contact_slot(p_sender text, p_limit int, p_window interval)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_sender is null or char_length(p_sender) not between 32 and 128
     or p_limit is null or p_limit < 1 or p_window is null or p_window <= interval '0' then
    raise exception 'bad_request' using errcode = '22023';
  end if;
  -- Serialise per sender so parallel posts can't all slip under the limit.
  perform pg_advisory_xact_lock(hashtextextended('contact:' || p_sender, 0));
  delete from public.contact_attempts where created_at < now() - greatest(p_window, interval '1 day');
  if (
    select count(*) from public.contact_attempts a
    where a.sender_hash = p_sender and a.created_at >= now() - p_window
  ) >= p_limit then
    return false;
  end if;
  insert into public.contact_attempts (sender_hash) values (p_sender);
  return true;
end;
$$;

revoke execute on function public.claim_contact_slot(text, int, interval) from public, anon, authenticated;
grant execute on function public.claim_contact_slot(text, int, interval) to service_role;
