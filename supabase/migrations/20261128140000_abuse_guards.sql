-- Abuse guards (audit 2026-11-28, part 2). Run once in the SQL Editor. Safe to re-run.
--
-- 1) Notifications to other people: only for a real event between the two (a like, a match, a plan
--    request / acceptance / update, a birthday greeting). The sender's name inside the notification is
--    always taken from their profile, so nobody can send "X liked you" in someone else's name.
-- 2) Friends ("match" list): an accepted friendship needs a real relation (mutual like, accepted plan,
--    thanked birthday greeting) and no block. A pending request may only be sent in your own name;
--    only its receiver can accept it.
-- 3) Face verification: at most 5 attempts per day (checked by the verification-pipeline function).
-- Only app requests (role "authenticated") are checked; server code is trusted.

create or replace function public.people_related(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (exists (select 1 from public.likes where user_id = a and liked_user_id = b)
      and exists (select 1 from public.likes where user_id = b and liked_user_id = a))
    or exists (
      select 1 from public.plan_joins j join public.plans p on p.id = j.plan_id
      where j.status = 'accepted' and ((p.user_id = a and j.user_id = b) or (p.user_id = b and j.user_id = a))
    )
    or exists (
      select 1 from public.birthday_greetings g
      where g.thanked_at is not null and ((g.from_user = a and g.to_user = b) or (g.from_user = b and g.to_user = a))
    );
$$;
revoke all on function public.people_related(uuid, uuid) from public, anon, authenticated;

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocks
    where (user_id = a and blocked_user_id = b) or (user_id = b and blocked_user_id = a)
  );
$$;
revoke all on function public.is_blocked_between(uuid, uuid) from public, anon, authenticated;

-- 1) Notifications ------------------------------------------------------------------------
create or replace function public.notifications_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  my_name text;
  ok boolean := false;
  plan_id uuid;
begin
  if current_setting('role', true) is distinct from 'authenticated' or new.user_id = me then
    return new;
  end if;
  if new.actor_user_id is distinct from me or public.is_blocked_between(me, new.user_id) then
    raise exception 'notification_not_allowed' using errcode = 'P0001';
  end if;

  begin
    plan_id := nullif(new.data ->> 'plan_id', '')::uuid;
  exception when others then
    plan_id := null;
  end;

  if new.type = 'like' then
    ok := exists (select 1 from public.likes where user_id = me and liked_user_id = new.user_id);
  elsif new.type = 'match' then
    ok := exists (select 1 from public.likes where user_id = me and liked_user_id = new.user_id)
      and exists (select 1 from public.likes where user_id = new.user_id and liked_user_id = me);
  elsif new.type = 'plan_join' then
    ok := exists (
      select 1 from public.plan_joins j join public.plans p on p.id = j.plan_id
      where p.id = plan_id and p.user_id = new.user_id and j.user_id = me
    );
  elsif new.type in ('plan_accept', 'plan_update') then
    ok := exists (
      select 1 from public.plan_joins j join public.plans p on p.id = j.plan_id
      where p.id = plan_id and p.user_id = me and j.user_id = new.user_id and j.status = 'accepted'
    );
  elsif new.type = 'birthday_wish' then
    ok := exists (
      select 1 from public.birthday_greetings
      where from_user = me and to_user = new.user_id and created_at > now() - interval '10 minutes'
    );
  end if;
  if not ok then
    raise exception 'notification_not_allowed' using errcode = 'P0001';
  end if;

  -- The visible sender name always comes from the sender's profile.
  select full_name into my_name from public.profiles where id = me;
  new.data := coalesce(new.data, '{}'::jsonb);
  if new.data ? 'actor_name' or new.type <> 'match' then
    new.data := jsonb_set(new.data, '{actor_name}', to_jsonb(coalesce(my_name, '')));
  end if;
  if new.type = 'match' then
    new.data := jsonb_set(new.data, '{matched_user_name}', to_jsonb(coalesce(my_name, '')));
  end if;
  return new;
end;
$$;
drop trigger if exists notifications_guard on public.notifications;
create trigger notifications_guard before insert on public.notifications
  for each row execute function public.notifications_guard();

-- 2) Friends ----------------------------------------------------------------------------------
create or replace function public.friends_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if current_setting('role', true) is distinct from 'authenticated' then
    return new;
  end if;
  if new.user_id = new.friend_id then
    raise exception 'friend_self' using errcode = 'P0001';
  end if;

  if tg_op = 'UPDATE' then
    new.user_id := old.user_id;
    new.friend_id := old.friend_id;
    if new.status = 'accepted' and old.status is distinct from 'accepted'
       and me is distinct from old.friend_id and not public.people_related(old.user_id, old.friend_id) then
      raise exception 'friend_not_allowed' using errcode = 'P0001';
    end if;
  else
    if new.status = 'accepted' then
      if not public.people_related(new.user_id, new.friend_id) then
        raise exception 'friend_not_allowed' using errcode = 'P0001';
      end if;
    elsif new.user_id is distinct from me then
      raise exception 'friend_not_allowed' using errcode = 'P0001';
    end if;
  end if;

  if new.status = 'accepted' and public.is_blocked_between(new.user_id, new.friend_id) then
    raise exception 'blocked' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists friends_guard on public.friends;
create trigger friends_guard before insert or update on public.friends
  for each row execute function public.friends_guard();

-- 3) Face verification attempts: index for the daily limit check.
create index if not exists verification_attempts_user_time_idx on public.verification_attempts (user_id, created_at desc);
