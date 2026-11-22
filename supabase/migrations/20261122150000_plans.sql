-- "Plan ile tanış": people share a concrete plan (coffee, walk, concert…), others ask to join,
-- the owner accepts → a chat opens between them. App code: lib/plans.ts, app/(tabs)/plans.tsx.

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('coffee', 'food', 'walk', 'sport', 'concert', 'cinema', 'culture', 'games', 'travel', 'other')),
  title text not null check (char_length(btrim(title)) between 3 and 140),
  place text check (place is null or char_length(place) <= 80),
  city text,
  country text,
  starts_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists idx_plans_open on public.plans(status, starts_at);
create index if not exists idx_plans_user on public.plans(user_id);

create table if not exists public.plan_joins (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (plan_id, user_id)
);
create index if not exists idx_plan_joins_user on public.plan_joins(user_id);

create table if not exists public.plan_reports (
  plan_id uuid not null references public.plans(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  primary key (plan_id, reporter_id)
);

-- Plans hidden after 3 reports (kept for review). SECURITY DEFINER so it can count every report.
create or replace function public.plan_is_hidden(p_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select count(*) >= 3 from public.plan_reports where plan_id = p_plan_id;
$$;
revoke all on function public.plan_is_hidden(uuid) from public, anon;
grant execute on function public.plan_is_hidden(uuid) to authenticated;

-- At most 3 open upcoming plans per person (spam guard).
create or replace function public.plans_open_count(p_user uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.plans where user_id = p_user and status = 'open' and starts_at > now();
$$;
revoke all on function public.plans_open_count(uuid) from public, anon;
grant execute on function public.plans_open_count(uuid) to authenticated;

alter table public.plans enable row level security;
alter table public.plan_joins enable row level security;
alter table public.plan_reports enable row level security;

-- plans
drop policy if exists "plans_select" on public.plans;
create policy "plans_select" on public.plans for select to authenticated using (
  user_id = auth.uid()
  or (
    status = 'open'
    and not public.plan_is_hidden(id)
    and not exists (
      select 1 from public.blocks b
      where (b.user_id = auth.uid() and b.blocked_user_id = plans.user_id)
         or (b.user_id = plans.user_id and b.blocked_user_id = auth.uid())
    )
  )
);
drop policy if exists "plans_insert_own" on public.plans;
create policy "plans_insert_own" on public.plans for insert to authenticated with check (
  user_id = auth.uid()
  and status = 'open'
  and starts_at > now() - interval '1 hour'
  and starts_at < now() + interval '15 days'
  and public.plans_open_count(auth.uid()) < 3
);
drop policy if exists "plans_update_own" on public.plans;
create policy "plans_update_own" on public.plans for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "plans_delete_own" on public.plans;
create policy "plans_delete_own" on public.plans for delete to authenticated using (user_id = auth.uid());

-- plan_joins: the requester sees/creates/withdraws their own; the plan owner sees and answers requests.
drop policy if exists "plan_joins_select" on public.plan_joins;
create policy "plan_joins_select" on public.plan_joins for select to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from public.plans p where p.id = plan_joins.plan_id and p.user_id = auth.uid())
);
drop policy if exists "plan_joins_insert_own" on public.plan_joins;
create policy "plan_joins_insert_own" on public.plan_joins for insert to authenticated with check (
  user_id = auth.uid()
  and status = 'pending'
  and exists (
    select 1 from public.plans p
    where p.id = plan_joins.plan_id and p.user_id <> auth.uid() and p.status = 'open' and p.starts_at > now()
  )
);
drop policy if exists "plan_joins_update_owner" on public.plan_joins;
create policy "plan_joins_update_owner" on public.plan_joins for update to authenticated
  using (exists (select 1 from public.plans p where p.id = plan_joins.plan_id and p.user_id = auth.uid()))
  with check (status in ('accepted', 'declined'));
drop policy if exists "plan_joins_delete_own" on public.plan_joins;
create policy "plan_joins_delete_own" on public.plan_joins for delete to authenticated using (user_id = auth.uid());

-- plan_reports: insert own, read own.
drop policy if exists "plan_reports_insert_own" on public.plan_reports;
create policy "plan_reports_insert_own" on public.plan_reports for insert to authenticated with check (reporter_id = auth.uid());
drop policy if exists "plan_reports_select_own" on public.plan_reports;
create policy "plan_reports_select_own" on public.plan_reports for select to authenticated using (reporter_id = auth.uid());

grant select, insert, update, delete on public.plans to authenticated;
grant select, insert, update, delete on public.plan_joins to authenticated;
grant select, insert on public.plan_reports to authenticated;

-- In-app notification types for plans.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('like', 'match', 'message', 'friend_request', 'system', 'plan_join', 'plan_accept'));
