-- Dry Run schema.
--
-- Access model: the browser never talks to Supabase. Every read and write goes through
-- the Next.js server, which checks the Clerk session and uses the SECRET key. Row-level
-- security is ON for every table with NO policies, so the publishable (anon) key and
-- any signed-in Supabase role can read and write nothing. That keeps private clone
-- profiles (`profiles.clone`) and contact info off the client entirely; the server only
-- ever returns what each person is allowed to see.

-- profiles: one per person (Clerk user id), plus demo people ---------------------------
create table public.profiles (
  user_id     text primary key,               -- Clerk id, or 'demo_*' for seeded demo people
  name        text not null check (char_length(name) between 1 and 40),
  year        text not null default '' check (char_length(year) <= 60),
  bio         text not null default '' check (char_length(bio) <= 160),     -- public one-liner
  contact     text not null default '' check (char_length(contact) <= 120), -- shown only after both say "want to meet"
  answers     jsonb not null default '[]'::jsonb check (jsonb_typeof(answers) = 'array'),
  clone       jsonb not null check (jsonb_typeof(clone) = 'object'),        -- PRIVATE clone profile
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- dates: one dry run between two people ------------------------------------------------
-- A real dry run starts as an invite: user_a creates it, shares the link (invite_token),
-- and it waits in 'invited' until someone else accepts. Accepting IS the second person's
-- opt-in. A dry run with a demo person skips straight to 'running'.
create table public.dates (
  id            uuid primary key default gen_random_uuid(),
  user_a        text not null references public.profiles(user_id) on delete cascade, -- who started it
  user_b        text references public.profiles(user_id) on delete cascade,          -- null until accepted
  invite_token  text unique,                   -- the secret in the invite link; null for demo dates
  invitee_label text not null default '' check (char_length(invitee_label) <= 60), -- private note for user_a ("Sam from Hinge")
  status        text not null default 'invited' check (status in ('invited', 'declined', 'running', 'done')),
  step          int  not null default 0,       -- next step to run (see lib/engine.ts actionAt)
  events        jsonb not null default '[]'::jsonb check (jsonb_typeof(events) = 'array'),
  report        jsonb check (report is null or jsonb_typeof(report) = 'object'),
  director_target text,                        -- private: what scene 2 was testing (for evals)
  a_meet        boolean,                       -- "want to meet?" answers, null = not answered
  b_meet        boolean,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (user_b is null or user_a <> user_b),
  check (status = 'invited' or status = 'declined' or user_b is not null)
);
create index dates_a on public.dates (user_a, created_at desc);
create index dates_b on public.dates (user_b, created_at desc);

-- updated_at ----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger dates_touch before update on public.dates for each row execute function public.touch_updated_at();

-- RLS on, no policies: only the server's secret key gets through ------------------------
alter table public.profiles enable row level security;
alter table public.dates    enable row level security;

-- Belt and braces: the public roles have no table privileges either.
revoke all on public.profiles, public.dates from anon, authenticated;
