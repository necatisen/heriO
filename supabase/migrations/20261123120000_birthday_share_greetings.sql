-- Birthday privacy + greetings ("Doğum gününü kutla" / "İkiz selamı").
-- 1) profiles.share_birthday: opt-in. Only people who turned it on appear in "birthday twins" and get the
--    birthday-week boost/badge in Explore. Default off (KVKK: the day/month is only revealed with consent).
-- 2) birthday_greetings: a short note one twin sends another (once per year per pair). No chat is opened;
--    the receiver can "thank" it, which opens a chat from their side (no unsolicited DMs).

alter table public.profiles add column if not exists share_birthday boolean not null default false;

-- Birthday week: only people who share their birthday.
create or replace function public.birthday_week_ids()
returns setof uuid
language sql
stable
security invoker
set search_path = public
as $$
  with today as (select (now() at time zone 'Europe/Istanbul')::date as d)
  select p.id
  from public.profiles p, today t
  where p.birth_date_exact
    and p.share_birthday
    and p.deleted_at is null
    and p.birth_date is not null
    and exists (
      select 1 from generate_series(0, 6) g(n)
      where to_char(t.d - g.n, 'MM-DD') = to_char(p.birth_date, 'MM-DD')
    );
$$;

-- Twins: the caller sees everyone who shares a birthday with them (the caller need not share their own).
create or replace function public.birthday_twins(max_rows int default 30)
returns table (id uuid, full_name text, profile_picture text, birth_date date, city text, country text, verification_status text)
language sql
stable
security invoker
set search_path = public
as $$
  select p.id, p.full_name, p.profile_picture, p.birth_date, p.city, p.country, p.verification_status
  from public.profiles p
  join public.profiles me on me.id = auth.uid()
  where me.birth_date_exact
    and p.birth_date_exact
    and p.share_birthday
    and p.id <> me.id
    and p.deleted_at is null
    and to_char(p.birth_date, 'MM-DD') = to_char(me.birth_date, 'MM-DD')
    and not exists (
      select 1 from public.blocks b
      where (b.user_id = me.id and b.blocked_user_id = p.id) or (b.user_id = p.id and b.blocked_user_id = me.id)
    )
  order by p.verification_status = 'verified' desc, p.last_seen desc nulls last
  limit least(greatest(max_rows, 1), 100);
$$;

grant execute on function public.birthday_week_ids() to authenticated;
grant execute on function public.birthday_twins(int) to authenticated;

create table if not exists public.birthday_greetings (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  year int not null default extract(year from (now() at time zone 'Europe/Istanbul'))::int,
  kind text not null check (kind in ('wish', 'hello')),
  note text check (note is null or char_length(note) <= 140),
  thanked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (from_user, to_user, year),
  check (from_user <> to_user)
);

create index if not exists birthday_greetings_to_idx on public.birthday_greetings (to_user, created_at desc);

alter table public.birthday_greetings enable row level security;

-- Both sides can read their greetings.
drop policy if exists birthday_greetings_select on public.birthday_greetings;
create policy birthday_greetings_select on public.birthday_greetings
  for select to authenticated
  using (from_user = auth.uid() or to_user = auth.uid());

-- Only real twins: same day/month, receiver shares their birthday, no block either way, this year only.
drop policy if exists birthday_greetings_insert on public.birthday_greetings;
create policy birthday_greetings_insert on public.birthday_greetings
  for insert to authenticated
  with check (
    from_user = auth.uid()
    and thanked_at is null
    and year = extract(year from (now() at time zone 'Europe/Istanbul'))::int
    and exists (
      select 1
      from public.profiles me
      join public.profiles p on p.id = birthday_greetings.to_user
      where me.id = auth.uid()
        and me.birth_date_exact
        and p.birth_date_exact
        and p.share_birthday
        and p.deleted_at is null
        and to_char(p.birth_date, 'MM-DD') = to_char(me.birth_date, 'MM-DD')
    )
    and not exists (
      select 1 from public.blocks b
      where (b.user_id = auth.uid() and b.blocked_user_id = birthday_greetings.to_user)
         or (b.user_id = birthday_greetings.to_user and b.blocked_user_id = auth.uid())
    )
  );

-- The receiver can mark it thanked (only that column) or delete it.
drop policy if exists birthday_greetings_update on public.birthday_greetings;
create policy birthday_greetings_update on public.birthday_greetings
  for update to authenticated
  using (to_user = auth.uid())
  with check (to_user = auth.uid());

revoke update on public.birthday_greetings from authenticated;
grant select, insert, delete on public.birthday_greetings to authenticated;
grant update (thanked_at) on public.birthday_greetings to authenticated;

drop policy if exists birthday_greetings_delete on public.birthday_greetings;
create policy birthday_greetings_delete on public.birthday_greetings
  for delete to authenticated
  using (to_user = auth.uid());

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('like', 'match', 'message', 'friend_request', 'system', 'plan_join', 'plan_accept', 'birthday_wish'));
