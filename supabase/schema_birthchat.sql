-- Generated from live project schema
set check_function_bodies = false;

-- Extensions
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pgcrypto" with schema extensions;

-- Tables
create table if not exists public."blocks" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "blocked_user_id" uuid not null,
  "created_at" timestamp with time zone default now(),
  "blocker_id" uuid,
  "blocked_id" uuid,
  "reason" text
);
create table if not exists public."chat_history" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "matched_user_id" uuid not null,
  "last_matched_at" timestamp with time zone default now()
);
create table if not exists public."chat_sessions" (
  "id" uuid default gen_random_uuid() not null,
  "user1_id" uuid,
  "user2_id" uuid,
  "status" text default 'active'::text not null,
  "started_at" timestamp with time zone default now(),
  "ended_at" timestamp with time zone,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);
create table if not exists public."credit_transactions" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "amount" integer not null,
  "type" text not null,
  "description" text,
  "created_at" timestamp with time zone default now()
);
create table if not exists public."credits" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "balance" integer default 1000 not null,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);
create table if not exists public."friends" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "friend_id" uuid not null,
  "status" text default 'pending'::text not null,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);
create table if not exists public."likes" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "liked_user_id" uuid not null,
  "created_at" timestamp with time zone default now()
);
create table if not exists public."message_reactions" (
  "id" uuid default gen_random_uuid() not null,
  "message_id" uuid not null,
  "user_id" uuid not null,
  "emoji" text not null,
  "created_at" timestamp with time zone default now()
);
create table if not exists public."messages" (
  "id" uuid default gen_random_uuid() not null,
  "session_id" uuid not null,
  "sender_id" uuid,
  "receiver_id" uuid,
  "content" text,
  "is_read" boolean default false,
  "reply_to_id" uuid,
  "edited_at" timestamp with time zone,
  "is_deleted" boolean default false,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "read_at" timestamp with time zone,
  "attachment_url" text,
  "attachment_type" text
);
create table if not exists public."notifications" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "actor_user_id" uuid,
  "type" text not null,
  "data" jsonb default '{}'::jsonb not null,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone default now()
);
create table if not exists public."photos" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "photo_url" text not null,
  "created_at" timestamp with time zone default now()
);
create table if not exists public."profile_views" (
  "id" uuid default gen_random_uuid() not null,
  "viewer_id" uuid not null,
  "viewed_user_id" uuid not null,
  "created_at" timestamp with time zone default now()
);
create table if not exists public."profiles" (
  "id" uuid not null,
  "full_name" text not null,
  "username" text not null,
  "bio" text default ''::text,
  "photo_url" text,
  "profile_picture" text,
  "birth_date" date not null,
  "gender" text,
  "country" text default 'Turkey'::text,
  "city" text,
  "district" text,
  "height" integer,
  "weight" integer,
  "tc_verified" boolean default false,
  "face_verified" boolean default false,
  "preferred_language" text default 'tr'::text,
  "religion" text,
  "profession" text,
  "relationship_status" text,
  "education" text,
  "nationality" text,
  "is_online" boolean default false,
  "last_seen" timestamp with time zone default now(),
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "latitude" double precision,
  "longitude" double precision,
  "body_type" text,
  "alcohol_consumption" text,
  "smoking_habit" text,
  "children_status" text,
  "is_verified" boolean default false,
  "languages" text[] default '{}'::text[],
  "verification_status" text default 'unverified'::text not null,
  "relationship_goal" text
);
create table if not exists public."push_tokens" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "token" text not null,
  "platform" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);
create table if not exists public."subscriptions" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "is_premium" boolean default false,
  "subscription_start" timestamp with time zone,
  "subscription_end" timestamp with time zone,
  "platform" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "plan_type" text
);
create table if not exists public."user_reports" (
  "id" uuid default gen_random_uuid() not null,
  "reporter_id" uuid not null,
  "reported_user_id" uuid not null,
  "reason" text,
  "created_at" timestamp with time zone default now()
);
create table if not exists public."verification_attempts" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "selfie_storage_path" text,
  "profile_photo_url" text,
  "stage_1_passed" boolean default false,
  "stage_2_similarity" numeric(5,4),
  "stage_3_passed" boolean default false,
  "status" text default 'pending_review'::text not null,
  "rejection_reason" text,
  "created_at" timestamp with time zone default now(),
  "reviewed_at" timestamp with time zone
);

-- Constraints
alter table public."blocks" add constraint "blocks_pkey" PRIMARY KEY (id);
alter table public."blocks" add constraint "blocks_user_id_blocked_user_id_key" UNIQUE (user_id, blocked_user_id);
alter table public."chat_history" add constraint "chat_history_pkey" PRIMARY KEY (id);
alter table public."chat_sessions" add constraint "chat_sessions_distinct_users" CHECK (((user1_id IS NULL) OR (user2_id IS NULL) OR (user1_id <> user2_id)));
alter table public."chat_sessions" add constraint "chat_sessions_pkey" PRIMARY KEY (id);
alter table public."chat_sessions" add constraint "chat_sessions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'ended'::text])));
alter table public."credit_transactions" add constraint "credit_transactions_pkey" PRIMARY KEY (id);
alter table public."credit_transactions" add constraint "credit_transactions_type_check" CHECK ((type = ANY (ARRAY['initial'::text, 'purchase'::text, 'ad_watch'::text, 'chat_spent'::text, 'refund'::text, 'admin_adjustment'::text])));
alter table public."credits" add constraint "credits_balance_check" CHECK ((balance >= 0));
alter table public."credits" add constraint "credits_balance_nonnegative" CHECK ((balance >= 0));
alter table public."credits" add constraint "credits_pkey" PRIMARY KEY (id);
alter table public."credits" add constraint "credits_user_id_key" UNIQUE (user_id);
alter table public."friends" add constraint "friends_not_self" CHECK ((user_id <> friend_id));
alter table public."friends" add constraint "friends_pkey" PRIMARY KEY (id);
alter table public."friends" add constraint "friends_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'blocked'::text])));
alter table public."friends" add constraint "friends_user_id_friend_id_key" UNIQUE (user_id, friend_id);
alter table public."likes" add constraint "likes_pkey" PRIMARY KEY (id);
alter table public."likes" add constraint "likes_user_id_liked_user_id_key" UNIQUE (user_id, liked_user_id);
alter table public."message_reactions" add constraint "message_reactions_message_id_user_id_key" UNIQUE (message_id, user_id);
alter table public."message_reactions" add constraint "message_reactions_pkey" PRIMARY KEY (id);
alter table public."messages" add constraint "messages_attachment_type_check" CHECK (((attachment_type IS NULL) OR (attachment_type = ANY (ARRAY['image'::text, 'video'::text]))));
alter table public."messages" add constraint "messages_pkey" PRIMARY KEY (id);
alter table public."notifications" add constraint "notifications_pkey" PRIMARY KEY (id);
alter table public."notifications" add constraint "notifications_type_check" CHECK ((type = ANY (ARRAY['like'::text, 'match'::text, 'message'::text, 'friend_request'::text, 'system'::text])));
alter table public."photos" add constraint "photos_pkey" PRIMARY KEY (id);
alter table public."profile_views" add constraint "profile_views_pkey" PRIMARY KEY (id);
alter table public."profiles" add constraint "profiles_gender_check" CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text])));
alter table public."profiles" add constraint "profiles_pkey" PRIMARY KEY (id);
alter table public."profiles" add constraint "profiles_username_key" UNIQUE (username);
alter table public."profiles" add constraint "profiles_verification_status_check" CHECK ((verification_status = ANY (ARRAY['unverified'::text, 'pending'::text, 'verified'::text, 'rejected'::text])));
alter table public."push_tokens" add constraint "push_tokens_pkey" PRIMARY KEY (id);
alter table public."push_tokens" add constraint "push_tokens_platform_check" CHECK ((platform = ANY (ARRAY['ios'::text, 'android'::text, 'web'::text])));
alter table public."push_tokens" add constraint "push_tokens_user_id_platform_key" UNIQUE (user_id, platform);
alter table public."subscriptions" add constraint "subscriptions_pkey" PRIMARY KEY (id);
alter table public."subscriptions" add constraint "subscriptions_plan_type_check" CHECK ((plan_type = ANY (ARRAY['monthly'::text, '3month'::text, 'yearly'::text])));
alter table public."subscriptions" add constraint "subscriptions_platform_check" CHECK ((platform = ANY (ARRAY['google'::text, 'apple'::text])));
alter table public."subscriptions" add constraint "subscriptions_user_id_key" UNIQUE (user_id);
alter table public."user_reports" add constraint "user_reports_pkey" PRIMARY KEY (id);
alter table public."user_reports" add constraint "user_reports_reporter_id_reported_user_id_key" UNIQUE (reporter_id, reported_user_id);
alter table public."verification_attempts" add constraint "verification_attempts_pkey" PRIMARY KEY (id);
alter table public."verification_attempts" add constraint "verification_attempts_status_check" CHECK ((status = ANY (ARRAY['pending_review'::text, 'approved'::text, 'rejected'::text])));
alter table public."blocks" add constraint "blocks_blocked_fk" FOREIGN KEY (blocked_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."blocks" add constraint "blocks_blocked_user_id_fkey" FOREIGN KEY (blocked_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."blocks" add constraint "blocks_blocker_fk" FOREIGN KEY (blocker_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."blocks" add constraint "blocks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."chat_history" add constraint "chat_history_matched_user_id_fkey" FOREIGN KEY (matched_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."chat_history" add constraint "chat_history_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."chat_sessions" add constraint "chat_sessions_user1_id_fkey" FOREIGN KEY (user1_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."chat_sessions" add constraint "chat_sessions_user2_id_fkey" FOREIGN KEY (user2_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."credit_transactions" add constraint "credit_transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."credits" add constraint "credits_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."friends" add constraint "friends_friend_id_fkey" FOREIGN KEY (friend_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."friends" add constraint "friends_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."likes" add constraint "likes_liked_user_id_fkey" FOREIGN KEY (liked_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."likes" add constraint "likes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."message_reactions" add constraint "message_reactions_message_id_fkey" FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE;
alter table public."message_reactions" add constraint "message_reactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."messages" add constraint "messages_receiver_id_fkey" FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."messages" add constraint "messages_reply_to_id_fkey" FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL;
alter table public."messages" add constraint "messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."messages" add constraint "messages_session_id_fkey" FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE;
alter table public."notifications" add constraint "notifications_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."photos" add constraint "photos_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."profile_views" add constraint "profile_views_viewed_user_id_fkey" FOREIGN KEY (viewed_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."profile_views" add constraint "profile_views_viewer_id_fkey" FOREIGN KEY (viewer_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."push_tokens" add constraint "push_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."subscriptions" add constraint "subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."user_reports" add constraint "user_reports_reported_user_id_fkey" FOREIGN KEY (reported_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."user_reports" add constraint "user_reports_reporter_id_fkey" FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."verification_attempts" add constraint "verification_attempts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX idx_profiles_is_verified ON public.profiles USING btree (is_verified) WHERE (is_verified = true);
CREATE INDEX idx_friends_friend_id ON public.friends USING btree (friend_id);
CREATE INDEX idx_profiles_birth_date ON public.profiles USING btree (birth_date);
CREATE INDEX idx_profiles_religion ON public.profiles USING btree (religion);
CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);
CREATE INDEX idx_chat_history_user ON public.chat_history USING btree (user_id);
CREATE INDEX idx_profiles_height ON public.profiles USING btree (height);
CREATE INDEX blocks_blocker_id_idx ON public.blocks USING btree (blocker_id);
CREATE INDEX idx_friends_status ON public.friends USING btree (status);
CREATE INDEX idx_notifications_user_id_unread ON public.notifications USING btree (user_id) WHERE (read_at IS NULL);
CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions USING btree (created_at);
CREATE INDEX idx_likes_user_id ON public.likes USING btree (user_id);
CREATE INDEX idx_profiles_verification_status ON public.profiles USING btree (verification_status) WHERE (verification_status = 'verified'::text);
CREATE INDEX idx_verification_attempts_user_id ON public.verification_attempts USING btree (user_id);
CREATE INDEX blocks_blocked_id_idx ON public.blocks USING btree (blocked_id);
CREATE INDEX photos_user_id_idx ON public.photos USING btree (user_id);
CREATE INDEX idx_messages_session_created ON public.messages USING btree (session_id, created_at);
CREATE INDEX idx_messages_receiver_id ON public.messages USING btree (receiver_id);
CREATE INDEX idx_profiles_body_type ON public.profiles USING btree (body_type);
CREATE INDEX idx_chat_sessions_users ON public.chat_sessions USING btree (user1_id, user2_id);
CREATE INDEX idx_profiles_city ON public.profiles USING btree (city);
CREATE INDEX idx_messages_session_id ON public.messages USING btree (session_id);
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions USING btree (user_id);
CREATE INDEX idx_profile_views_viewer_id ON public.profile_views USING btree (viewer_id);
CREATE INDEX idx_blocks_user ON public.blocks USING btree (user_id);
CREATE INDEX idx_photos_user_id ON public.photos USING btree (user_id);
CREATE INDEX idx_notifications_user_id_created_at ON public.notifications USING btree (user_id, created_at DESC);
CREATE INDEX idx_blocks_blocked ON public.blocks USING btree (blocked_user_id);
CREATE INDEX idx_messages_reply_to_id ON public.messages USING btree (reply_to_id);
CREATE INDEX idx_blocks_blocker ON public.blocks USING btree (user_id);
CREATE INDEX idx_chat_sessions_user2 ON public.chat_sessions USING btree (user2_id);
CREATE INDEX idx_likes_liked_user_id ON public.likes USING btree (liked_user_id);
CREATE INDEX idx_profiles_location ON public.profiles USING btree (latitude, longitude) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));
CREATE INDEX idx_push_tokens_user_id ON public.push_tokens USING btree (user_id);
CREATE INDEX idx_verification_attempts_created_at ON public.verification_attempts USING btree (created_at DESC);
CREATE INDEX idx_profiles_is_online ON public.profiles USING btree (is_online);
CREATE INDEX idx_messages_is_deleted ON public.messages USING btree (is_deleted);
CREATE INDEX idx_profiles_gender ON public.profiles USING btree (gender);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);
CREATE INDEX idx_profiles_country_city ON public.profiles USING btree (country, city);
CREATE INDEX idx_profile_views_viewed_user_id ON public.profile_views USING btree (viewed_user_id);
CREATE INDEX idx_verification_attempts_status ON public.verification_attempts USING btree (status) WHERE (status = 'pending_review'::text);
CREATE INDEX idx_chat_sessions_user1 ON public.chat_sessions USING btree (user1_id);
CREATE INDEX idx_credits_user_id ON public.credits USING btree (user_id);
CREATE INDEX idx_user_reports_reported ON public.user_reports USING btree (reported_user_id);
CREATE INDEX idx_messages_session ON public.messages USING btree (session_id);
CREATE INDEX idx_friends_user ON public.friends USING btree (user_id);
CREATE INDEX idx_message_reactions_message_id ON public.message_reactions USING btree (message_id);
CREATE INDEX idx_friends_user_id ON public.friends USING btree (user_id);
CREATE INDEX idx_profiles_username ON public.profiles USING btree (username);
CREATE INDEX idx_messages_receiver_read ON public.messages USING btree (receiver_id, is_read, read_at) WHERE (is_read = false);

-- Functions
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;
CREATE OR REPLACE FUNCTION public.add_initial_credits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.credits (user_id, balance)
  values (new.id, 1000)
  on conflict (user_id) do nothing;

  insert into public.credit_transactions (user_id, amount, type, description)
  values (new.id, 1000, 'initial', 'Welcome bonus');

  return new;
end;
$function$;
CREATE OR REPLACE FUNCTION public.delete_user_account()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  delete from public.subscriptions where user_id = v_uid;
  delete from public.credit_transactions where user_id = v_uid;
  delete from public.credits where user_id = v_uid;
  delete from public.verification_attempts where user_id = v_uid;
  delete from public.push_tokens where user_id = v_uid;
  delete from public.blocks where user_id = v_uid or blocked_user_id = v_uid;
  delete from public.message_reactions where user_id = v_uid;

  -- Anonymize chat artifacts (keep sessions/messages for the other participant)
  update public.messages
  set
    content = null,
    attachment_url = null,
    attachment_type = null,
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
$function$;
CREATE OR REPLACE FUNCTION public.deduct_credits(user_id uuid, amount integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  current_balance integer;
BEGIN
  -- Lock the row for update
  SELECT balance INTO current_balance
  FROM credits
  WHERE credits.user_id = deduct_credits.user_id
  FOR UPDATE;

  -- Check if user has enough credits
  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'User credits not found';
  END IF;

  IF current_balance < amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Deduct credits
  UPDATE credits
  SET balance = balance - amount
  WHERE credits.user_id = deduct_credits.user_id;
END;
$function$;
CREATE OR REPLACE FUNCTION public.delete_all_users()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM auth.users;
END;
$function$;
CREATE OR REPLACE FUNCTION public.deduct_credits(p_user_id uuid, p_amount integer, p_type text DEFAULT 'chat_spent'::text, p_description text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_username text;
begin
  v_username := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
    'user_' || substr(replace(new.id::text, '-', ''), 1, 12)
  );

  insert into public.profiles (
    id,
    full_name,
    username,
    bio,
    birth_date,
    gender,
    country,
    city,
    district,
    height,
    weight,
    preferred_language,
    religion,
    profession,
    relationship_status,
    education,
    body_type,
    children_status,
    smoking_habit,
    alcohol_consumption
  ) values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'User'),
    v_username,
    coalesce(new.raw_user_meta_data ->> 'bio', ''),
    coalesce((new.raw_user_meta_data ->> 'birth_date')::date, '2000-01-01'::date),
    coalesce(new.raw_user_meta_data ->> 'gender', 'other'),
    coalesce(new.raw_user_meta_data ->> 'country', 'Turkey'),
    nullif(trim(new.raw_user_meta_data ->> 'city'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'district'), ''),
    (new.raw_user_meta_data ->> 'height')::integer,
    (new.raw_user_meta_data ->> 'weight')::integer,
    coalesce(new.raw_user_meta_data ->> 'preferred_language', 'tr'),
    nullif(trim(new.raw_user_meta_data ->> 'religion'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'profession'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'relationship_status'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'education'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'body_type'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'children_status'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'smoking_habit'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'alcohol_consumption'), '')
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, is_premium)
  values (new.id, false)
  on conflict (user_id) do nothing;

  return new;
end;
$function$;
CREATE OR REPLACE FUNCTION public.check_message_rate_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_count integer;
  v_limit integer := 30;
  v_report_count integer;
begin
  select count(*) into v_report_count
  from public.user_reports
  where reported_user_id = new.sender_id;

  if v_report_count >= 1 then
    v_limit := 5;
  end if;

  select count(*) into v_count
  from public.messages
  where sender_id = new.sender_id
    and created_at > now() - interval '1 minute';

  if v_count >= v_limit then
    raise exception 'Message rate limit exceeded. Please wait a moment.';
  end if;
  return new;
end;
$function$;
CREATE OR REPLACE FUNCTION public.set_verification_status(target_user_id uuid, new_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new_status not in ('unverified', 'pending', 'verified', 'rejected') then
    raise invalid_parameter_value using message = 'Invalid verification_status';
  end if;
  update public.profiles
  set verification_status = new_status
  where id = target_user_id;
end;
$function$;

-- Function privileges
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
grant execute on function public.rls_auto_enable() to public;
grant execute on function public.rls_auto_enable() to postgres;
grant execute on function public.rls_auto_enable() to anon;
grant execute on function public.rls_auto_enable() to authenticated;
grant execute on function public.rls_auto_enable() to service_role;
revoke all on function public.set_updated_at() from public, anon, authenticated;
grant execute on function public.set_updated_at() to public;
grant execute on function public.set_updated_at() to postgres;
grant execute on function public.set_updated_at() to anon;
grant execute on function public.set_updated_at() to authenticated;
grant execute on function public.set_updated_at() to service_role;
revoke all on function public.add_initial_credits() from public, anon, authenticated;
grant execute on function public.add_initial_credits() to public;
grant execute on function public.add_initial_credits() to postgres;
grant execute on function public.add_initial_credits() to anon;
grant execute on function public.add_initial_credits() to authenticated;
grant execute on function public.add_initial_credits() to service_role;
revoke all on function public.delete_user_account() from public, anon, authenticated;
grant execute on function public.delete_user_account() to public;
grant execute on function public.delete_user_account() to postgres;
grant execute on function public.delete_user_account() to anon;
grant execute on function public.delete_user_account() to authenticated;
grant execute on function public.delete_user_account() to service_role;
revoke all on function public.deduct_credits(uuid,integer) from public, anon, authenticated;
grant execute on function public.deduct_credits(uuid,integer) to public;
grant execute on function public.deduct_credits(uuid,integer) to postgres;
grant execute on function public.deduct_credits(uuid,integer) to anon;
grant execute on function public.deduct_credits(uuid,integer) to authenticated;
grant execute on function public.deduct_credits(uuid,integer) to service_role;
revoke all on function public.delete_all_users() from public, anon, authenticated;
grant execute on function public.delete_all_users() to public;
grant execute on function public.delete_all_users() to postgres;
grant execute on function public.delete_all_users() to anon;
grant execute on function public.delete_all_users() to authenticated;
grant execute on function public.delete_all_users() to service_role;
revoke all on function public.deduct_credits(uuid,integer,text,text) from public, anon, authenticated;
grant execute on function public.deduct_credits(uuid,integer,text,text) to public;
grant execute on function public.deduct_credits(uuid,integer,text,text) to postgres;
grant execute on function public.deduct_credits(uuid,integer,text,text) to anon;
grant execute on function public.deduct_credits(uuid,integer,text,text) to authenticated;
grant execute on function public.deduct_credits(uuid,integer,text,text) to service_role;
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to public;
grant execute on function public.handle_new_user() to postgres;
grant execute on function public.handle_new_user() to anon;
grant execute on function public.handle_new_user() to authenticated;
grant execute on function public.handle_new_user() to service_role;
revoke all on function public.check_message_rate_limit() from public, anon, authenticated;
grant execute on function public.check_message_rate_limit() to public;
grant execute on function public.check_message_rate_limit() to postgres;
grant execute on function public.check_message_rate_limit() to anon;
grant execute on function public.check_message_rate_limit() to authenticated;
grant execute on function public.check_message_rate_limit() to service_role;
revoke all on function public.set_verification_status(uuid,text) from public, anon, authenticated;
grant execute on function public.set_verification_status(uuid,text) to public;
grant execute on function public.set_verification_status(uuid,text) to postgres;
grant execute on function public.set_verification_status(uuid,text) to service_role;

-- Row level security
alter table public."chat_sessions" enable row level security;
alter table public."likes" enable row level security;
alter table public."friends" enable row level security;
alter table public."messages" enable row level security;
alter table public."notifications" enable row level security;
alter table public."profile_views" enable row level security;
alter table public."chat_history" enable row level security;
alter table public."blocks" enable row level security;
alter table public."push_tokens" enable row level security;
alter table public."user_reports" enable row level security;
alter table public."photos" enable row level security;
alter table public."credit_transactions" enable row level security;
alter table public."credits" enable row level security;
alter table public."subscriptions" enable row level security;
alter table public."verification_attempts" enable row level security;
alter table public."profiles" enable row level security;
alter table public."message_reactions" enable row level security;

-- Policies
drop policy if exists "blocks_delete_own" on public."blocks";
create policy "blocks_delete_own" on public."blocks" as permissive for delete to authenticated using ((user_id = auth.uid()));
drop policy if exists "blocks_insert_own" on public."blocks";
create policy "blocks_insert_own" on public."blocks" as permissive for insert to authenticated with check ((user_id = auth.uid()));
drop policy if exists "blocks_select_own" on public."blocks";
create policy "blocks_select_own" on public."blocks" as permissive for select to authenticated using (((user_id = auth.uid()) OR (blocked_user_id = auth.uid())));
drop policy if exists "insert_own_blocks" on public."blocks";
create policy "insert_own_blocks" on public."blocks" as permissive for insert to public with check ((auth.uid() = blocker_id));
drop policy if exists "select_own_blocks" on public."blocks";
create policy "select_own_blocks" on public."blocks" as permissive for select to public using ((auth.uid() = blocker_id));
drop policy if exists "chat_sessions_insert_participants" on public."chat_sessions";
create policy "chat_sessions_insert_participants" on public."chat_sessions" as permissive for insert to authenticated with check ((((auth.uid() = user1_id) OR (auth.uid() = user2_id)) AND (user1_id IS NOT NULL) AND (user2_id IS NOT NULL)));
drop policy if exists "chat_sessions_select_participants" on public."chat_sessions";
create policy "chat_sessions_select_participants" on public."chat_sessions" as permissive for select to authenticated using (((auth.uid() = user1_id) OR (auth.uid() = user2_id)));
drop policy if exists "chat_sessions_update_participants" on public."chat_sessions";
create policy "chat_sessions_update_participants" on public."chat_sessions" as permissive for update to authenticated using (((auth.uid() = user1_id) OR (auth.uid() = user2_id))) with check (((auth.uid() = user1_id) OR (auth.uid() = user2_id)));
drop policy if exists "credit_transactions_insert_own" on public."credit_transactions";
create policy "credit_transactions_insert_own" on public."credit_transactions" as permissive for insert to authenticated with check ((user_id = auth.uid()));
drop policy if exists "credit_transactions_select_own" on public."credit_transactions";
create policy "credit_transactions_select_own" on public."credit_transactions" as permissive for select to authenticated using ((user_id = auth.uid()));
drop policy if exists "credits_insert_own" on public."credits";
create policy "credits_insert_own" on public."credits" as permissive for insert to authenticated with check ((user_id = auth.uid()));
drop policy if exists "credits_select_own" on public."credits";
create policy "credits_select_own" on public."credits" as permissive for select to authenticated using ((user_id = auth.uid()));
drop policy if exists "credits_update_own" on public."credits";
create policy "credits_update_own" on public."credits" as permissive for update to authenticated using ((user_id = auth.uid())) with check ((user_id = auth.uid()));
drop policy if exists "friends_delete_participants" on public."friends";
create policy "friends_delete_participants" on public."friends" as permissive for delete to authenticated using (((auth.uid() = user_id) OR (auth.uid() = friend_id)));
drop policy if exists "friends_insert_participants" on public."friends";
create policy "friends_insert_participants" on public."friends" as permissive for insert to authenticated with check (((auth.uid() = user_id) OR (auth.uid() = friend_id)));
drop policy if exists "friends_select_participants" on public."friends";
create policy "friends_select_participants" on public."friends" as permissive for select to authenticated using (((auth.uid() = user_id) OR (auth.uid() = friend_id)));
drop policy if exists "friends_update_participants" on public."friends";
create policy "friends_update_participants" on public."friends" as permissive for update to authenticated using (((auth.uid() = user_id) OR (auth.uid() = friend_id))) with check (((auth.uid() = user_id) OR (auth.uid() = friend_id)));
drop policy if exists "Users can create likes" on public."likes";
create policy "Users can create likes" on public."likes" as permissive for insert to authenticated with check ((auth.uid() = user_id));
drop policy if exists "Users can delete their own likes" on public."likes";
create policy "Users can delete their own likes" on public."likes" as permissive for delete to authenticated using ((auth.uid() = user_id));
drop policy if exists "Users can view their own likes" on public."likes";
create policy "Users can view their own likes" on public."likes" as permissive for select to authenticated using ((auth.uid() = user_id));
drop policy if exists "Users can view who liked them" on public."likes";
create policy "Users can view who liked them" on public."likes" as permissive for select to authenticated using ((auth.uid() = liked_user_id));
drop policy if exists "likes_delete_own" on public."likes";
create policy "likes_delete_own" on public."likes" as permissive for delete to authenticated using ((auth.uid() = user_id));
drop policy if exists "likes_insert_own" on public."likes";
create policy "likes_insert_own" on public."likes" as permissive for insert to authenticated with check (((auth.uid() = user_id) AND (user_id <> liked_user_id)));
drop policy if exists "likes_select_received" on public."likes";
create policy "likes_select_received" on public."likes" as permissive for select to authenticated using ((auth.uid() = liked_user_id));
drop policy if exists "likes_select_sent" on public."likes";
create policy "likes_select_sent" on public."likes" as permissive for select to authenticated using ((auth.uid() = user_id));
drop policy if exists "message_reactions_delete_own" on public."message_reactions";
create policy "message_reactions_delete_own" on public."message_reactions" as permissive for delete to authenticated using ((user_id = auth.uid()));
drop policy if exists "message_reactions_insert_own" on public."message_reactions";
create policy "message_reactions_insert_own" on public."message_reactions" as permissive for insert to authenticated with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (messages m
     JOIN chat_sessions cs ON ((cs.id = m.session_id)))
  WHERE ((m.id = message_reactions.message_id) AND ((auth.uid() = cs.user1_id) OR (auth.uid() = cs.user2_id)))))));
drop policy if exists "message_reactions_select_session" on public."message_reactions";
create policy "message_reactions_select_session" on public."message_reactions" as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM (messages m
     JOIN chat_sessions cs ON ((cs.id = m.session_id)))
  WHERE ((m.id = message_reactions.message_id) AND ((auth.uid() = cs.user1_id) OR (auth.uid() = cs.user2_id))))));
drop policy if exists "message_reactions_update_own" on public."message_reactions";
create policy "message_reactions_update_own" on public."message_reactions" as permissive for update to authenticated using ((user_id = auth.uid())) with check ((user_id = auth.uid()));
drop policy if exists "messages_insert_sender_in_session" on public."messages";
create policy "messages_insert_sender_in_session" on public."messages" as permissive for insert to authenticated with check (((sender_id = auth.uid()) AND (receiver_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM chat_sessions cs
  WHERE ((cs.id = messages.session_id) AND (((cs.user1_id = messages.sender_id) AND (cs.user2_id = messages.receiver_id)) OR ((cs.user2_id = messages.sender_id) AND (cs.user1_id = messages.receiver_id))))))));
drop policy if exists "messages_select_session_participants" on public."messages";
create policy "messages_select_session_participants" on public."messages" as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM chat_sessions cs
  WHERE ((cs.id = messages.session_id) AND ((auth.uid() = cs.user1_id) OR (auth.uid() = cs.user2_id))))));
drop policy if exists "messages_update_receiver_read" on public."messages";
create policy "messages_update_receiver_read" on public."messages" as permissive for update to authenticated using (((receiver_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM chat_sessions cs
  WHERE ((cs.id = messages.session_id) AND ((auth.uid() = cs.user1_id) OR (auth.uid() = cs.user2_id))))))) with check ((receiver_id = auth.uid()));
drop policy if exists "messages_update_sender_edit_delete" on public."messages";
create policy "messages_update_sender_edit_delete" on public."messages" as permissive for update to authenticated using (((sender_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM chat_sessions cs
  WHERE ((cs.id = messages.session_id) AND ((auth.uid() = cs.user1_id) OR (auth.uid() = cs.user2_id))))))) with check ((sender_id = auth.uid()));
drop policy if exists "notifications_delete_own" on public."notifications";
create policy "notifications_delete_own" on public."notifications" as permissive for delete to authenticated using ((user_id = auth.uid()));
drop policy if exists "notifications_insert_self_or_actor" on public."notifications";
create policy "notifications_insert_self_or_actor" on public."notifications" as permissive for insert to authenticated with check (((user_id = auth.uid()) OR (actor_user_id = auth.uid())));
drop policy if exists "notifications_select_own" on public."notifications";
create policy "notifications_select_own" on public."notifications" as permissive for select to authenticated using ((user_id = auth.uid()));
drop policy if exists "notifications_update_own" on public."notifications";
create policy "notifications_update_own" on public."notifications" as permissive for update to authenticated using ((user_id = auth.uid())) with check ((user_id = auth.uid()));
drop policy if exists "Users can delete own photos" on public."photos";
create policy "Users can delete own photos" on public."photos" as permissive for delete to authenticated using ((auth.uid() = user_id));
drop policy if exists "Users can insert own photos" on public."photos";
create policy "Users can insert own photos" on public."photos" as permissive for insert to authenticated with check ((auth.uid() = user_id));
drop policy if exists "Users can view any photos" on public."photos";
create policy "Users can view any photos" on public."photos" as permissive for select to authenticated using (true);
drop policy if exists "photos_delete_own" on public."photos";
create policy "photos_delete_own" on public."photos" as permissive for delete to authenticated using ((auth.uid() = user_id));
drop policy if exists "photos_insert_own" on public."photos";
create policy "photos_insert_own" on public."photos" as permissive for insert to authenticated with check ((auth.uid() = user_id));
drop policy if exists "photos_select_own" on public."photos";
create policy "photos_select_own" on public."photos" as permissive for select to authenticated using ((auth.uid() = user_id));
drop policy if exists "Users can create profile views" on public."profile_views";
create policy "Users can create profile views" on public."profile_views" as permissive for insert to authenticated with check ((auth.uid() = viewer_id));
drop policy if exists "Users can view their profile views" on public."profile_views";
create policy "Users can view their profile views" on public."profile_views" as permissive for select to authenticated using ((auth.uid() = viewed_user_id));
drop policy if exists "profile_views_insert_viewer" on public."profile_views";
create policy "profile_views_insert_viewer" on public."profile_views" as permissive for insert to authenticated with check (((viewer_id = auth.uid()) AND (viewer_id <> viewed_user_id)));
drop policy if exists "profile_views_select_viewed_user" on public."profile_views";
create policy "profile_views_select_viewed_user" on public."profile_views" as permissive for select to authenticated using ((viewed_user_id = auth.uid()));
drop policy if exists "profiles_delete_own" on public."profiles";
create policy "profiles_delete_own" on public."profiles" as permissive for delete to authenticated using ((auth.uid() = id));
drop policy if exists "profiles_insert_own" on public."profiles";
create policy "profiles_insert_own" on public."profiles" as permissive for insert to authenticated with check ((auth.uid() = id));
drop policy if exists "profiles_select_all" on public."profiles";
create policy "profiles_select_all" on public."profiles" as permissive for select to authenticated using ((deleted_at IS NULL));
drop policy if exists "profiles_update_own" on public."profiles";
create policy "profiles_update_own" on public."profiles" as permissive for update to authenticated using ((auth.uid() = id)) with check ((auth.uid() = id));
drop policy if exists "push_tokens_delete_own" on public."push_tokens";
create policy "push_tokens_delete_own" on public."push_tokens" as permissive for delete to authenticated using ((user_id = auth.uid()));
drop policy if exists "push_tokens_insert_own" on public."push_tokens";
create policy "push_tokens_insert_own" on public."push_tokens" as permissive for insert to authenticated with check ((user_id = auth.uid()));
drop policy if exists "push_tokens_select_own" on public."push_tokens";
create policy "push_tokens_select_own" on public."push_tokens" as permissive for select to authenticated using ((user_id = auth.uid()));
drop policy if exists "push_tokens_update_own" on public."push_tokens";
create policy "push_tokens_update_own" on public."push_tokens" as permissive for update to authenticated using ((user_id = auth.uid())) with check ((user_id = auth.uid()));
drop policy if exists "subscriptions_insert_own" on public."subscriptions";
create policy "subscriptions_insert_own" on public."subscriptions" as permissive for insert to authenticated with check ((user_id = auth.uid()));
drop policy if exists "subscriptions_select_own" on public."subscriptions";
create policy "subscriptions_select_own" on public."subscriptions" as permissive for select to authenticated using ((user_id = auth.uid()));
drop policy if exists "subscriptions_update_own" on public."subscriptions";
create policy "subscriptions_update_own" on public."subscriptions" as permissive for update to authenticated using ((user_id = auth.uid())) with check ((user_id = auth.uid()));
drop policy if exists "user_reports_insert_own" on public."user_reports";
create policy "user_reports_insert_own" on public."user_reports" as permissive for insert to authenticated with check ((reporter_id = auth.uid()));
drop policy if exists "user_reports_select_own" on public."user_reports";
create policy "user_reports_select_own" on public."user_reports" as permissive for select to authenticated using (((reporter_id = auth.uid()) OR (reported_user_id = auth.uid())));
drop policy if exists "verification_attempts_insert_own" on public."verification_attempts";
create policy "verification_attempts_insert_own" on public."verification_attempts" as permissive for insert to authenticated with check ((auth.uid() = user_id));
drop policy if exists "verification_attempts_select_own" on public."verification_attempts";
create policy "verification_attempts_select_own" on public."verification_attempts" as permissive for select to authenticated using ((auth.uid() = user_id));
drop policy if exists "avatars_delete_own" on storage."objects";
create policy "avatars_delete_own" on storage."objects" as permissive for delete to authenticated using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
drop policy if exists "avatars_insert_authenticated" on storage."objects";
create policy "avatars_insert_authenticated" on storage."objects" as permissive for insert to authenticated with check ((bucket_id = 'avatars'::text));
drop policy if exists "avatars_select_public" on storage."objects";
create policy "avatars_select_public" on storage."objects" as permissive for select to public using ((bucket_id = 'avatars'::text));
drop policy if exists "avatars_update_own" on storage."objects";
create policy "avatars_update_own" on storage."objects" as permissive for update to authenticated using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
drop policy if exists "chat_media_delete_own" on storage."objects";
create policy "chat_media_delete_own" on storage."objects" as permissive for delete to authenticated using (((bucket_id = 'chat-media'::text) AND (owner = auth.uid())));
drop policy if exists "chat_media_insert_authenticated" on storage."objects";
create policy "chat_media_insert_authenticated" on storage."objects" as permissive for insert to authenticated with check ((bucket_id = 'chat-media'::text));
drop policy if exists "chat_media_select_authenticated" on storage."objects";
create policy "chat_media_select_authenticated" on storage."objects" as permissive for select to authenticated using ((bucket_id = 'chat-media'::text));
drop policy if exists "verification_selfies_insert_own" on storage."objects";
create policy "verification_selfies_insert_own" on storage."objects" as permissive for insert to authenticated with check (((bucket_id = 'verification-selfies'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
drop policy if exists "verification_selfies_select_own" on storage."objects";
create policy "verification_selfies_select_own" on storage."objects" as permissive for select to authenticated using (((bucket_id = 'verification-selfies'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

-- Triggers
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_friends_updated_at BEFORE UPDATE ON public.friends FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_chat_sessions_updated_at BEFORE UPDATE ON public.chat_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_credits_updated_at BEFORE UPDATE ON public.credits FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER on_profile_created_add_credits AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION add_initial_credits();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
CREATE TRIGGER messages_rate_limit_trigger BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION check_message_rate_limit();

-- Realtime
alter publication supabase_realtime add table public."likes";
alter publication supabase_realtime add table public."friends";
alter publication supabase_realtime add table public."chat_sessions";
alter publication supabase_realtime add table public."messages";
alter publication supabase_realtime add table public."message_reactions";

-- Storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('avatar', 'avatar', true, 5242880, array['image/*']) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/gif','image/webp']) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('chat-media', 'chat-media', false, 10485760, array['image/jpeg','image/png','image/gif','image/webp','video/mp4']) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('verification-selfies', 'verification-selfies', false, 5242880, array['image/jpeg','image/png']) on conflict (id) do nothing;
-- Table privileges (same as source project)
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
