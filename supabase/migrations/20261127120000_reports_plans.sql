-- 1) Reports: the same person may report the same user again (new message / new plan),
--    but at most 3 times a day per reported user and 20 reports a day overall (abuse guard).
-- 2) Plans: the owner can edit category / title / place / time while the plan is open
--    (time stays within the next 15 days, at most 5 edits, "edited" label via edited_at).

-- 1) user_reports ---------------------------------------------------------------
alter table public.user_reports drop constraint if exists user_reports_reporter_id_reported_user_id_key;
create index if not exists user_reports_reporter_idx on public.user_reports (reporter_id, created_at desc);

create or replace function public.user_reports_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.user_reports
      where reporter_id = new.reporter_id and reported_user_id = new.reported_user_id
        and created_at > now() - interval '24 hours') >= 3 then
    raise exception 'report_limit_user' using errcode = 'P0001';
  end if;
  if (select count(*) from public.user_reports
      where reporter_id = new.reporter_id and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'report_limit_daily' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists user_reports_limit on public.user_reports;
create trigger user_reports_limit before insert on public.user_reports
  for each row execute function public.user_reports_limit();

-- 2) plans ----------------------------------------------------------------------
alter table public.plans add column if not exists edited_at timestamptz;
alter table public.plans add column if not exists edit_count int not null default 0;

create or replace function public.plans_guard_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Never changeable by the client.
  if new.user_id is distinct from old.user_id or new.created_at is distinct from old.created_at then
    raise exception 'plan_readonly' using errcode = 'P0001';
  end if;
  if new.category is distinct from old.category
     or new.title is distinct from old.title
     or new.place is distinct from old.place
     or new.starts_at is distinct from old.starts_at
     or new.city is distinct from old.city
     or new.country is distinct from old.country then
    if old.status <> 'open' or new.status <> 'open' then
      raise exception 'plan_not_open' using errcode = 'P0001';
    end if;
    if new.starts_at < now() or new.starts_at > now() + interval '15 days' then
      raise exception 'plan_time_range' using errcode = 'P0001';
    end if;
    if old.edit_count >= 5 then
      raise exception 'plan_edit_limit' using errcode = 'P0001';
    end if;
    new.edit_count := old.edit_count + 1;
    new.edited_at := now();
  else
    -- Status-only updates (cancel) must not touch the edit counters.
    new.edit_count := old.edit_count;
    new.edited_at := old.edited_at;
  end if;
  return new;
end;
$$;
drop trigger if exists plans_guard_update on public.plans;
create trigger plans_guard_update before update on public.plans
  for each row execute function public.plans_guard_update();

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('like', 'match', 'message', 'friend_request', 'system', 'plan_join', 'plan_accept', 'plan_update', 'birthday_wish', 'report', 'moderation'));

