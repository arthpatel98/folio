-- Run this once in Supabase Dashboard > SQL Editor > New query.
create table if not exists public.user_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_app_state enable row level security;

drop policy if exists "own app state" on public.user_app_state;
create policy "own app state" on public.user_app_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
