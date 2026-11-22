-- 1) Polite close ("Kibar kapanış"): one side sends a kind closing note, then the chat is closed for both.
--    The session stays visible (so the other person reads the note) but nobody can write in it any more.
alter table public.chat_sessions add column if not exists closed_by uuid references auth.users(id) on delete set null;
alter table public.chat_sessions add column if not exists closed_at timestamptz;

drop policy if exists "messages_insert_sender_in_session" on public.messages;
create policy "messages_insert_sender_in_session" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and receiver_id is not null
    and exists (
      select 1 from public.chat_sessions cs
      where cs.id = messages.session_id
        and cs.closed_at is null
        and (
          (cs.user1_id = messages.sender_id and cs.user2_id = messages.receiver_id)
          or (cs.user2_id = messages.sender_id and cs.user1_id = messages.receiver_id)
        )
    )
  );

-- 2) Real birthdays. Until now the app stored only an age (birth_date = <year>-01-01).
--    birth_date_exact = true once the user picked their real day and month.
alter table public.profiles add column if not exists birth_date_exact boolean not null default false;

-- People whose birthday week is now (birthday today or in the last 6 days, Istanbul time).
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
    and p.deleted_at is null
    and p.birth_date is not null
    and exists (
      select 1 from generate_series(0, 6) g(n)
      where to_char(t.d - g.n, 'MM-DD') = to_char(p.birth_date, 'MM-DD')
    );
$$;

-- "Doğum günü ikizlerin": other people born on the same day and month as the caller.
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
