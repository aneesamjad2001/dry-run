-- Opt-in profile photos (TA feedback on v1: "I want to see who I'm meeting").
--
-- The picture is shrunk in the browser to a small square JPEG and stored here, apart
-- from profiles, so reading a profile never drags the image along. It is served only by
-- the Next.js server (app/api/photos/[key]) to signed-in UChicago students who were
-- handed its key: the person themself, and people they share an invite or a dry run with.
-- The key is random and changes on every upload, so an old link stops working.

alter table public.profiles add column photo_key text unique;

create table public.photos (
  user_id    text primary key references public.profiles(user_id) on delete cascade,
  data       text not null check (char_length(data) <= 280000), -- base64 JPEG, about 200 KB at most
  updated_at timestamptz not null default now()
);

alter table public.photos enable row level security;
revoke all on public.photos from anon, authenticated;
