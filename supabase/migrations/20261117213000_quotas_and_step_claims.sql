-- Spend protection (from the security review).
--
-- 1. Daily quotas per person, counted atomically and stored apart from profiles, so
--    parallel requests can't race past the cap and deleting your clone doesn't reset it.
-- 2. A claim on each date step, taken BEFORE the model call, so parallel requests for the
--    same step make one model call, not hundreds.

create table public.usage (
  user_id text not null,                       -- Clerk id; no foreign key on purpose (survives deletion)
  day     date not null,
  builds  int  not null default 0,             -- clone builds today
  dates   int  not null default 0,             -- dry runs started today
  primary key (user_id, day)
);
alter table public.usage enable row level security;
revoke all on public.usage from anon, authenticated;

-- Takes one unit of today's quota. Returns false when the person is at the cap. The
-- conditional UPDATE locks the row, so concurrent calls can't both pass.
create or replace function public.take_quota(p_user text, p_kind text, p_max int)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  today date := (now() at time zone 'utc')::date;
  n int;
begin
  insert into public.usage (user_id, day) values (p_user, today) on conflict (user_id, day) do nothing;
  if p_kind = 'builds' then
    update public.usage set builds = builds + 1 where user_id = p_user and day = today and builds < p_max returning builds into n;
  elsif p_kind = 'dates' then
    update public.usage set dates = dates + 1 where user_id = p_user and day = today and dates < p_max returning dates into n;
  else
    raise exception 'unknown quota %', p_kind;
  end if;
  return n is not null;
end
$$;
revoke execute on function public.take_quota(text, text, int) from public, anon, authenticated;

alter table public.dates add column step_claimed_at timestamptz;
