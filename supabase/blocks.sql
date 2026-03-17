-- Blocks table for user blocking / moderation

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists blocks_blocker_id_idx on public.blocks (blocker_id);
create index if not exists blocks_blocked_id_idx on public.blocks (blocked_id);

-- Row Level Security
alter table public.blocks enable row level security;

-- Users can see only their own blocks
create policy if not exists "select_own_blocks"
on public.blocks
for select
using (auth.uid() = blocker_id);

-- Users can insert blocks only as themselves
create policy if not exists "insert_own_blocks"
on public.blocks
for insert
with check (auth.uid() = blocker_id);

