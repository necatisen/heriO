/*
  Supabase production-ready schema (single-file)
  - Tables: profiles, likes, friends, chat_sessions, messages, credits, credit_transactions,
            subscriptions, photos, notifications, profile_views
  - RLS enabled on all tables with user-scoped policies
  - RPC: deduct_credits(), delete_user_account()
*/

begin;

-- Extensions
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
-- Tables
-- =========================

-- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  username text unique not null,
  bio text default ''::text,
  photo_url text,
  profile_picture text,
  birth_date date not null,
  gender text check (gender in ('male', 'female', 'other')),
  country text default 'Turkey'::text,
  city text,
  district text,
  height integer,
  weight integer,
  tc_verified boolean default false,
  face_verified boolean default false,
  preferred_language text default 'tr'::text,
  religion text,
  profession text,
  relationship_status text,
  education text,
  nationality text,
  is_online boolean default false,
  last_seen timestamptz default now(),
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  latitude double precision,
  longitude double precision,
  body_type text,
  languages text[] default '{}',
  alcohol_consumption text,
  smoking_habit text,
  children_status text,
  is_verified boolean default false
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_profiles_country_city on public.profiles(country, city);
create index if not exists idx_profiles_gender on public.profiles(gender);
create index if not exists idx_profiles_birth_date on public.profiles(birth_date);
create index if not exists idx_profiles_height on public.profiles(height);
create index if not exists idx_profiles_body_type on public.profiles(body_type);
create index if not exists idx_profiles_religion on public.profiles(religion);
create index if not exists idx_profiles_city on public.profiles(city);
create index if not exists idx_profiles_is_online on public.profiles(is_online);
create index if not exists idx_profiles_is_verified on public.profiles(is_verified) where is_verified = true;
create index if not exists idx_profiles_location on public.profiles(latitude, longitude) where latitude is not null and longitude is not null;

-- photos (private-by-default)
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_url text not null,
  created_at timestamptz default now()
);
create index if not exists idx_photos_user_id on public.photos(user_id);

-- likes
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  liked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, liked_user_id)
);
create index if not exists idx_likes_user_id on public.likes(user_id);
create index if not exists idx_likes_liked_user_id on public.likes(liked_user_id);

-- friends (bidirectional rows are allowed)
create table if not exists public.friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'::text check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, friend_id),
  constraint friends_not_self check (user_id <> friend_id)
);

drop trigger if exists trg_friends_updated_at on public.friends;
create trigger trg_friends_updated_at
before update on public.friends
for each row execute function public.set_updated_at();

create index if not exists idx_friends_user_id on public.friends(user_id);
create index if not exists idx_friends_friend_id on public.friends(friend_id);
create index if not exists idx_friends_status on public.friends(status);

-- chat_sessions
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid references auth.users(id) on delete set null,
  user2_id uuid references auth.users(id) on delete set null,
  status text not null default 'active'::text check (status in ('active', 'ended')),
  started_at timestamptz default now(),
  ended_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint chat_sessions_distinct_users check (user1_id is null or user2_id is null or user1_id <> user2_id)
);

drop trigger if exists trg_chat_sessions_updated_at on public.chat_sessions;
create trigger trg_chat_sessions_updated_at
before update on public.chat_sessions
for each row execute function public.set_updated_at();

create index if not exists idx_chat_sessions_user1 on public.chat_sessions(user1_id);
create index if not exists idx_chat_sessions_user2 on public.chat_sessions(user2_id);

-- messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  receiver_id uuid references auth.users(id) on delete set null,
  content text,
  is_read boolean default false,
  read_at timestamptz,
  reply_to_id uuid references public.messages(id) on delete set null,
  edited_at timestamptz,
  is_deleted boolean default false,
  deleted_at timestamptz,
  attachment_url text,
  attachment_type text check (attachment_type is null or attachment_type in ('image', 'video')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists trg_messages_updated_at on public.messages;
create trigger trg_messages_updated_at
before update on public.messages
for each row execute function public.set_updated_at();

create index if not exists idx_messages_session_id on public.messages(session_id);
create index if not exists idx_messages_sender_id on public.messages(sender_id);
create index if not exists idx_messages_receiver_id on public.messages(receiver_id);
create index if not exists idx_messages_reply_to_id on public.messages(reply_to_id);
create index if not exists idx_messages_is_deleted on public.messages(is_deleted);
create index if not exists idx_messages_session_created on public.messages(session_id, created_at asc);
create index if not exists idx_messages_receiver_read on public.messages(receiver_id, is_read, read_at) where is_read = false;

-- credits
create table if not exists public.credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  balance integer not null default 1000 check (balance >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists trg_credits_updated_at on public.credits;
create trigger trg_credits_updated_at
before update on public.credits
for each row execute function public.set_updated_at();

create index if not exists idx_credits_user_id on public.credits(user_id);

-- credit_transactions
create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  type text not null check (type in ('initial', 'purchase', 'ad_watch', 'chat_spent', 'refund', 'admin_adjustment')),
  description text,
  created_at timestamptz default now()
);
create index if not exists idx_credit_transactions_user_id on public.credit_transactions(user_id);
create index if not exists idx_credit_transactions_created_at on public.credit_transactions(created_at);

-- subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  is_premium boolean default false,
  subscription_start timestamptz,
  subscription_end timestamptz,
  plan_type text check (plan_type in ('monthly', '3month', 'yearly')),
  platform text check (platform in ('google', 'apple')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);

-- notifications
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

-- profile_views (no expression-based unique; günlük tek kayıt uygulama tarafında)
create table if not exists public.profile_views (
  id uuid primary key default gen_random_uuid(),
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);
create index if not exists idx_profile_views_viewer_id on public.profile_views(viewer_id);
create index if not exists idx_profile_views_viewed_user_id on public.profile_views(viewed_user_id);

-- blocks (kim kimi engelledi: user_id=engelleyen, blocked_user_id=engellenen)
create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, blocked_user_id)
);
create index if not exists idx_blocks_blocker on public.blocks(user_id);
create index if not exists idx_blocks_blocked on public.blocks(blocked_user_id);

-- push_tokens (Expo push bildirimleri)
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

-- =========================
-- RLS
-- =========================

alter table public.profiles enable row level security;
alter table public.photos enable row level security;
alter table public.likes enable row level security;
alter table public.friends enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.messages enable row level security;
alter table public.credits enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.subscriptions enable row level security;
alter table public.notifications enable row level security;
alter table public.profile_views enable row level security;
alter table public.blocks enable row level security;
alter table public.push_tokens enable row level security;

-- Drop old policy names (from earlier migrations) to avoid "already exists" errors
drop policy if exists "Users can view all profiles" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can delete own profile" on public.profiles;
drop policy if exists "Users can view own credits" on public.credits;
drop policy if exists "Users can insert own credits" on public.credits;
drop policy if exists "Users can update own credits" on public.credits;
drop policy if exists "Users can view own transactions" on public.credit_transactions;
drop policy if exists "Users can insert own transactions" on public.credit_transactions;
drop policy if exists "Users can view own subscription" on public.subscriptions;
drop policy if exists "Users can insert own subscription" on public.subscriptions;
drop policy if exists "Users can update own subscription" on public.subscriptions;
drop policy if exists "Users can view own chat sessions" on public.chat_sessions;
drop policy if exists "Users can insert chat sessions" on public.chat_sessions;
drop policy if exists "Users can update own chat sessions" on public.chat_sessions;
drop policy if exists "Users can view own messages" on public.messages;
drop policy if exists "Users can send messages" on public.messages;
drop policy if exists "Users can update own received messages" on public.messages;
drop policy if exists "Users can view own friends" on public.friends;
drop policy if exists "Users can add friends" on public.friends;
drop policy if exists "Users can update own friend requests" on public.friends;
drop policy if exists "Users can delete own friends" on public.friends;
-- blocks (only if table exists from old migration)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'blocks') then
    drop policy if exists "Users can view own blocks" on public.blocks;
    drop policy if exists "Users can block users" on public.blocks;
    drop policy if exists "Users can unblock users" on public.blocks;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'chat_history') then
    drop policy if exists "Users can view own chat history" on public.chat_history;
    drop policy if exists "Users can insert chat history" on public.chat_history;
    drop policy if exists "Users can update own chat history" on public.chat_history;
  end if;
end $$;

-- Profiles
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
on public.profiles
for select
to authenticated
using (deleted_at is null);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
on public.profiles
for delete
to authenticated
using (auth.uid() = id);

-- Photos (owner-only)
drop policy if exists "photos_select_own" on public.photos;
create policy "photos_select_own"
on public.photos
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "photos_insert_own" on public.photos;
create policy "photos_insert_own"
on public.photos
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "photos_delete_own" on public.photos;
create policy "photos_delete_own"
on public.photos
for delete
to authenticated
using (auth.uid() = user_id);

-- Likes (see sent + received)
drop policy if exists "likes_select_sent" on public.likes;
create policy "likes_select_sent"
on public.likes
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "likes_select_received" on public.likes;
create policy "likes_select_received"
on public.likes
for select
to authenticated
using (auth.uid() = liked_user_id);

drop policy if exists "likes_insert_own" on public.likes;
create policy "likes_insert_own"
on public.likes
for insert
to authenticated
with check (auth.uid() = user_id and user_id <> liked_user_id);

drop policy if exists "likes_delete_own" on public.likes;
create policy "likes_delete_own"
on public.likes
for delete
to authenticated
using (auth.uid() = user_id);

-- Friends
drop policy if exists "friends_select_participants" on public.friends;
create policy "friends_select_participants"
on public.friends
for select
to authenticated
using (auth.uid() = user_id or auth.uid() = friend_id);

drop policy if exists "friends_insert_participants" on public.friends;
create policy "friends_insert_participants"
on public.friends
for insert
to authenticated
with check (auth.uid() = user_id or auth.uid() = friend_id);

drop policy if exists "friends_update_participants" on public.friends;
create policy "friends_update_participants"
on public.friends
for update
to authenticated
using (auth.uid() = user_id or auth.uid() = friend_id)
with check (auth.uid() = user_id or auth.uid() = friend_id);

drop policy if exists "friends_delete_participants" on public.friends;
create policy "friends_delete_participants"
on public.friends
for delete
to authenticated
using (auth.uid() = user_id or auth.uid() = friend_id);

-- Chat sessions (participants only)
drop policy if exists "chat_sessions_select_participants" on public.chat_sessions;
create policy "chat_sessions_select_participants"
on public.chat_sessions
for select
to authenticated
using (auth.uid() = user1_id or auth.uid() = user2_id);

drop policy if exists "chat_sessions_insert_participants" on public.chat_sessions;
create policy "chat_sessions_insert_participants"
on public.chat_sessions
for insert
to authenticated
with check (
  (auth.uid() = user1_id or auth.uid() = user2_id)
  and user1_id is not null
  and user2_id is not null
);

drop policy if exists "chat_sessions_update_participants" on public.chat_sessions;
create policy "chat_sessions_update_participants"
on public.chat_sessions
for update
to authenticated
using (auth.uid() = user1_id or auth.uid() = user2_id)
with check (auth.uid() = user1_id or auth.uid() = user2_id);

-- Messages (only session participants can read; sender can write; receiver can mark read)
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

-- Credits
drop policy if exists "credits_select_own" on public.credits;
create policy "credits_select_own"
on public.credits
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "credits_insert_own" on public.credits;
create policy "credits_insert_own"
on public.credits
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "credits_update_own" on public.credits;
create policy "credits_update_own"
on public.credits
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Credit transactions
drop policy if exists "credit_transactions_select_own" on public.credit_transactions;
create policy "credit_transactions_select_own"
on public.credit_transactions
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "credit_transactions_insert_own" on public.credit_transactions;
create policy "credit_transactions_insert_own"
on public.credit_transactions
for insert
to authenticated
with check (user_id = auth.uid());

-- Subscriptions
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
on public.subscriptions
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own"
on public.subscriptions
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own"
on public.subscriptions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Notifications
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

-- Profile views
drop policy if exists "profile_views_select_viewed_user" on public.profile_views;
create policy "profile_views_select_viewed_user"
on public.profile_views
for select
to authenticated
using (viewed_user_id = auth.uid());

drop policy if exists "profile_views_insert_viewer" on public.profile_views;
create policy "profile_views_insert_viewer"
on public.profile_views
for insert
to authenticated
with check (viewer_id = auth.uid() and viewer_id <> viewed_user_id);

-- blocks
drop policy if exists "blocks_insert_own" on public.blocks;
create policy "blocks_insert_own" on public.blocks for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "blocks_select_own" on public.blocks;
create policy "blocks_select_own" on public.blocks for select to authenticated
  using (user_id = auth.uid() or blocked_user_id = auth.uid());
drop policy if exists "blocks_delete_own" on public.blocks;
create policy "blocks_delete_own" on public.blocks for delete to authenticated
  using (user_id = auth.uid());

-- push_tokens
drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own" on public.push_tokens for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own" on public.push_tokens for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own" on public.push_tokens for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own" on public.push_tokens for delete to authenticated
  using (user_id = auth.uid());

-- =========================
-- Triggers / Functions
-- =========================

-- Auto-create credits row and initial transaction on profile insert
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
-- RPC
-- =========================

-- Atomically deduct credits; prevents negative balance.
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

-- Deletes/anonymizes the current user's data and deletes auth user (if permitted).
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

  -- Anonymize profile (keep row until auth deletion cascades, but hide via deleted_at)
  v_new_username := 'deleted_' || replace(v_uid::text, '-', '');
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
  delete from public.blocks where user_id = v_uid or blocked_user_id = v_uid;
  delete from public.push_tokens where user_id = v_uid;
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

-- Realtime (optional; requires publication exists)
do $$
begin
  begin
    alter publication supabase_realtime add table public.friends;
  exception when duplicate_object then
    null;
  when undefined_object then
    null;
  end;
  begin
    alter publication supabase_realtime add table public.likes;
  exception when duplicate_object then
    null;
  when undefined_object then
    null;
  end;
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then
    null;
  when undefined_object then
    null;
  end;
  begin
    alter publication supabase_realtime add table public.chat_sessions;
  exception when duplicate_object then
    null;
  when undefined_object then
    null;
  end;
end $$;

commit;

