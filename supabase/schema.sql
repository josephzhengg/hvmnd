-- Run this in the Supabase SQL editor to provision the leaderboard.
create table if not exists public.scores (
  id           uuid primary key default gen_random_uuid(),
  signature    text not null,
  display_name text not null check (char_length(display_name) between 1 and 24),
  score        int  not null check (score >= 0),
  accuracy     real not null check (accuracy >= 0 and accuracy <= 1),
  total_ms     int  not null check (total_ms >= 0),
  mode         text not null check (mode in ('timed', 'fixed')),
  created_at   timestamptz not null default now()
);

create index if not exists scores_signature_idx on public.scores (signature);

alter table public.scores enable row level security;

create policy "anon can read scores"
  on public.scores for select
  using (true);

create policy "anon can insert scores"
  on public.scores for insert
  with check (
    char_length(display_name) between 1 and 24
    and score >= 0
    and accuracy >= 0 and accuracy <= 1
    and total_ms >= 0
    and mode in ('timed', 'fixed')
  );

-- Enable realtime for live leaderboard updates.
alter publication supabase_realtime add table public.scores;
