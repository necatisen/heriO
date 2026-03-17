/*
  Push token storage for Expo Notifications.
  Backend: Edge Function or webhook on notifications insert can read tokens and send via Expo Push API.
*/
begin;

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text check (platform in ('ios', 'android', 'web')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, platform)
);

create index if not exists idx_push_tokens_user_id on public.push_tokens(user_id);

alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own" on public.push_tokens for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own" on public.push_tokens for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own" on public.push_tokens for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own" on public.push_tokens for delete to authenticated
  using (user_id = auth.uid());

-- Service role can read tokens for sending push (e.g. from Edge Function)
-- RLS still applies; Edge Function would use service role key to fetch token by user_id.

commit;
