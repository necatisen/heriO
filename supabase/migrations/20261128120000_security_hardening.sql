-- Pre-launch security hardening (audit 2026-11-28).
-- Run once in the SQL Editor. Safe to re-run.
--
-- 1) CRITICAL: delete_all_users() (SECURITY DEFINER) was callable by anyone with the public app key → dropped.
--    Old deduct_credits(user_id, amount) had no auth check → dropped (the checked p_* version stays).
-- 2) Profiles were readable without signing in (anon) → signed-in users only.
--    Exact GPS coordinates were readable by every user → stored rounded (~1 km), distance still works.
-- 3) A message receiver could rewrite the text of messages they received (e.g. fake evidence for a report)
--    → receiver may only set is_read / read_at; sender may not move a message to another chat or person.
-- 4) Blocked people could open a new chat and keep writing → chats and messages are refused across a block.
--    A politely closed chat could be reopened by editing closed_at → closing is final, participants fixed.
-- 5) Storage: anyone could list every file in "avatars" (incl. chat photos) and upload into other people's
--    folders; any user could list "chat-media" → listing / upload only in your own folder.
--    Public avatar URLs keep working (public bucket files are served without these policies).
-- Server code (SECURITY DEFINER functions, edge functions with the service key) is not affected:
-- the guards below only apply when the caller is the app (role "authenticated").

-- 1) Dangerous functions ----------------------------------------------------------------
drop function if exists public.delete_all_users();
drop function if exists public.deduct_credits(uuid, integer);

-- Nothing in the public schema should be callable without signing in.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prorettype <> 'trigger'::regtype and p.prorettype <> 'event_trigger'::regtype
  loop
    execute format('revoke execute on function %s from anon, public', f.sig);
  end loop;
end $$;
grant execute on function public.is_staff(uuid) to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.user_is_banned(uuid) to authenticated;
-- Re-grant the app RPCs to signed-in users (revoke from public above also hit their default grant).
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('birthday_twins', 'birthday_week_ids', 'deduct_credits', 'delete_user_account', 'get_message_texts',
                        'is_staff', 'is_admin', 'user_is_banned', 'plan_is_hidden', 'plans_open_count')
  loop
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;

-- 2) Profiles ------------------------------------------------------------------------------
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles
  for select to authenticated
  using (deleted_at is null and (id = auth.uid() or not public.user_is_banned(id) or public.is_staff()));

create or replace function public.profiles_round_location()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- ~1.1 km precision: enough for "12 km away", not enough to find someone's home.
  if new.latitude is not null then new.latitude := round(new.latitude::numeric, 2)::double precision; end if;
  if new.longitude is not null then new.longitude := round(new.longitude::numeric, 2)::double precision; end if;
  return new;
end;
$$;
drop trigger if exists profiles_round_location on public.profiles;
create trigger profiles_round_location before insert or update of latitude, longitude on public.profiles
  for each row execute function public.profiles_round_location();
update public.profiles
set latitude = round(latitude::numeric, 2)::double precision, longitude = round(longitude::numeric, 2)::double precision
where latitude is not null or longitude is not null;

-- 3) + 4) Messages -----------------------------------------------------------------------------
create or replace function public.messages_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user <> 'authenticated' then
    return new; -- server-side code (account deletion, admin) is trusted
  end if;

  if tg_op = 'INSERT' then
    if exists (
      select 1 from public.blocks b
      where (b.user_id = new.sender_id and b.blocked_user_id = new.receiver_id)
         or (b.user_id = new.receiver_id and b.blocked_user_id = new.sender_id)
    ) then
      raise exception 'blocked' using errcode = 'P0001';
    end if;
    return new;
  end if;

  -- UPDATE: nobody moves a message to another chat / person or rewrites its time.
  new.session_id := old.session_id;
  new.sender_id := old.sender_id;
  new.receiver_id := old.receiver_id;
  new.created_at := old.created_at;
  if auth.uid() is distinct from old.sender_id then
    -- The receiver may only mark it as read.
    new.content := old.content;
    new.attachment_url := old.attachment_url;
    new.attachment_type := old.attachment_type;
    new.reply_to_id := old.reply_to_id;
    new.edited_at := old.edited_at;
    new.is_deleted := old.is_deleted;
    new.deleted_at := old.deleted_at;
  else
    -- The sender cannot fake "read".
    new.is_read := old.is_read;
    new.read_at := old.read_at;
  end if;
  return new;
end;
$$;
drop trigger if exists messages_guard on public.messages;
-- Runs before the encryption trigger (alphabetical: messages_guard < trg_messages_encrypt_content).
create trigger messages_guard before insert or update on public.messages
  for each row execute function public.messages_guard();

create or replace function public.chat_sessions_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.user1_id = new.user2_id then
      raise exception 'self_chat' using errcode = 'P0001';
    end if;
    if exists (
      select 1 from public.blocks b
      where (b.user_id = new.user1_id and b.blocked_user_id = new.user2_id)
         or (b.user_id = new.user2_id and b.blocked_user_id = new.user1_id)
    ) then
      raise exception 'blocked' using errcode = 'P0001';
    end if;
    new.closed_by := null;
    new.closed_at := null;
    return new;
  end if;

  -- UPDATE: the two people in the chat never change; a closed chat stays closed.
  new.user1_id := old.user1_id;
  new.user2_id := old.user2_id;
  new.started_at := old.started_at;
  if old.closed_at is not null then
    new.closed_at := old.closed_at;
    new.closed_by := old.closed_by;
  elsif new.closed_at is not null then
    new.closed_by := auth.uid();
  end if;
  return new;
end;
$$;
drop trigger if exists chat_sessions_guard on public.chat_sessions;
create trigger chat_sessions_guard before insert or update on public.chat_sessions
  for each row execute function public.chat_sessions_guard();

-- 5) Storage -------------------------------------------------------------------------------
drop policy if exists avatars_select_public on storage.objects;
create policy avatars_select_public on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_insert_authenticated on storage.objects;
create policy avatars_insert_authenticated on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists chat_media_select_authenticated on storage.objects;
create policy chat_media_select_authenticated on storage.objects
  for select to authenticated
  using (bucket_id = 'chat-media' and owner = auth.uid());

drop policy if exists chat_media_insert_authenticated on storage.objects;
create policy chat_media_insert_authenticated on storage.objects
  for insert to authenticated
  with check (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);
