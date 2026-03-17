/*
  Sync migration (idempotent)
  - Aligns DB schema + RLS policies + RPCs with project/supabase_schema.sql
  - Safe to run multiple times.
*/

begin;

create extension if not exists pgcrypto;

-- Helper: updated_at maintenance
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================
-- Tables (ensure existence)
-- =========================

-- profiles: add soft-delete if missing (table is created in initial migration)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'deleted_at'
  ) then
    alter table public.profiles add column deleted_at timestamptz;
  end if;
end $$;

-- notifications table (missing in earlier migrations)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('like', 'match', 'message', 'friend_request', 'system')),
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_notifications_user_id_created_at on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_user_id_unread on public.notifications(user_id) where read_at is null;

-- friends: ensure updated_at + trigger exists (older migration had no updated_at)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'friends' and column_name = 'updated_at'
  ) then
    alter table public.friends add column updated_at timestamptz default now();
  end if;
end $$;

drop trigger if exists trg_friends_updated_at on public.friends;
create trigger trg_friends_updated_at
before update on public.friends
for each row execute function public.set_updated_at();

-- chat_sessions: ensure updated_at + trigger exists (older migration had no updated_at)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'chat_sessions' and column_name = 'updated_at'
  ) then
    alter table public.chat_sessions add column updated_at timestamptz default now();
  end if;
end $$;

drop trigger if exists trg_chat_sessions_updated_at on public.chat_sessions;
create trigger trg_chat_sessions_updated_at
before update on public.chat_sessions
for each row execute function public.set_updated_at();

-- messages: ensure updated_at + trigger exists (older migration had no updated_at)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'updated_at'
  ) then
    alter table public.messages add column updated_at timestamptz default now();
  end if;
end $$;

drop trigger if exists trg_messages_updated_at on public.messages;
create trigger trg_messages_updated_at
before update on public.messages
for each row execute function public.set_updated_at();

-- credits: enforce non-negative constraint (if not present)
do $$
begin
  begin
    alter table public.credits
      add constraint credits_balance_nonnegative check (balance >= 0);
  exception when duplicate_object then
    null;
  end;
end $$;

-- =========================
-- RLS enablement
-- =========================

alter table public.notifications enable row level security;

-- =========================
-- Policies (tighten messages rule)
-- =========================

-- messages: drop old broad policy and replace with session-participant check
drop policy if exists "Users can view own messages" on public.messages;
drop policy if exists "messages_select_session_participants" on public.messages;
create policy "messages_select_session_participants"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.chat_sessions cs
    where cs.id = messages.session_id
      and (auth.uid() = cs.user1_id or auth.uid() = cs.user2_id)
  )
);

-- Insert: ensure sender is current user AND receiver matches session pair
drop policy if exists "Users can send messages" on public.messages;
drop policy if exists "messages_insert_sender_in_session" on public.messages;
create policy "messages_insert_sender_in_session"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and receiver_id is not null
  and exists (
    select 1
    from public.chat_sessions cs
    where cs.id = messages.session_id
      and (
        (cs.user1_id = sender_id and cs.user2_id = receiver_id)
        or (cs.user2_id = sender_id and cs.user1_id = receiver_id)
      )
  )
);

-- Update: receiver can mark read; sender can edit/delete
drop policy if exists "Users can update own received messages" on public.messages;
drop policy if exists "messages_update_receiver_read" on public.messages;
create policy "messages_update_receiver_read"
on public.messages
for update
to authenticated
using (
  receiver_id = auth.uid()
  and exists (
    select 1
    from public.chat_sessions cs
    where cs.id = messages.session_id
      and (auth.uid() = cs.user1_id or auth.uid() = cs.user2_id)
  )
)
with check (receiver_id = auth.uid());

drop policy if exists "messages_update_sender_edit_delete" on public.messages;
create policy "messages_update_sender_edit_delete"
on public.messages
for update
to authenticated
using (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.chat_sessions cs
    where cs.id = messages.session_id
      and (auth.uid() = cs.user1_id or auth.uid() = cs.user2_id)
  )
)
with check (sender_id = auth.uid());

-- notifications policies
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "notifications_insert_self_or_actor" on public.notifications;
create policy "notifications_insert_self_or_actor"
on public.notifications
for insert
to authenticated
with check (user_id = auth.uid() or actor_user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
on public.notifications
for delete
to authenticated
using (user_id = auth.uid());

-- =========================
-- Triggers / Functions
-- =========================

create or replace function public.add_initial_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.credits (user_id, balance)
  values (new.id, 1000)
  on conflict (user_id) do nothing;

  insert into public.credit_transactions (user_id, amount, type, description)
  values (new.id, 1000, 'initial', 'Welcome bonus');

  return new;
end;
$$;

drop trigger if exists on_profile_created_add_credits on public.profiles;
create trigger on_profile_created_add_credits
after insert on public.profiles
for each row execute function public.add_initial_credits();

-- =========================
-- RPC (replace with production-safe variants)
-- =========================

create or replace function public.deduct_credits(
  p_user_id uuid,
  p_amount integer,
  p_type text default 'chat_spent',
  p_description text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_new_balance integer;
begin
  if p_user_id is null or auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  if not (p_user_id = auth.uid() or auth.role() = 'service_role') then
    raise exception 'Not authorized';
  end if;

  select balance into v_balance
  from public.credits
  where user_id = p_user_id
  for update;

  if v_balance is null then
    raise exception 'User credits not found';
  end if;

  if v_balance < p_amount then
    raise exception 'Insufficient credits';
  end if;

  v_new_balance := v_balance - p_amount;

  update public.credits
  set balance = v_new_balance
  where user_id = p_user_id;

  insert into public.credit_transactions (user_id, amount, type, description)
  values (p_user_id, -p_amount, p_type, coalesce(p_description, 'Credits deducted'));

  return v_new_balance;
end;
$$;

create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_new_username text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  v_new_username := 'deleted_' || replace(v_uid::text, '-', '');

  -- Mark profile deleted and anonymize public fields
  update public.profiles
  set
    full_name = 'Deleted User',
    username = left(v_new_username, 30),
    bio = '',
    photo_url = null,
    profile_picture = null,
    city = null,
    district = null,
    profession = null,
    education = null,
    religion = null,
    relationship_status = null,
    nationality = null,
    is_online = false,
    deleted_at = now()
  where id = v_uid;

  -- Remove private user-owned data
  delete from public.photos where user_id = v_uid;
  delete from public.likes where user_id = v_uid or liked_user_id = v_uid;
  delete from public.friends where user_id = v_uid or friend_id = v_uid;
  delete from public.notifications where user_id = v_uid or actor_user_id = v_uid;
  delete from public.profile_views where viewer_id = v_uid or viewed_user_id = v_uid;
  delete from public.subscriptions where user_id = v_uid;
  delete from public.credit_transactions where user_id = v_uid;
  delete from public.credits where user_id = v_uid;

  -- Anonymize chat artifacts (keep sessions/messages for the other participant)
  update public.messages
  set
    content = null,
    is_deleted = true,
    deleted_at = coalesce(deleted_at, now()),
    sender_id = null
  where sender_id = v_uid;

  update public.messages
  set receiver_id = null
  where receiver_id = v_uid;

  update public.chat_sessions
  set user1_id = null
  where user1_id = v_uid;

  update public.chat_sessions
  set user2_id = null
  where user2_id = v_uid;

  delete from public.chat_sessions where user1_id is null and user2_id is null;

  -- Finally delete auth user (requires elevated privileges; in migrations this is typically allowed)
  delete from auth.users where id = v_uid;
end;
$$;

-- Realtime (best-effort)
do $$
begin
  begin
    alter publication supabase_realtime add table public.friends;
  exception when duplicate_object then null;
  when undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.likes;
  exception when duplicate_object then null;
  when undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null;
  when undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.chat_sessions;
  exception when duplicate_object then null;
  when undefined_object then null;
  end;
end $$;

commit;

