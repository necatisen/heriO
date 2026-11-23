-- Moderation: staff roles, reports inbox, bans with evidence, immutable action log.
-- Writes (ban, warn, role changes, log rows) only happen in the edge function `moderate-user`
-- with the service role, after it checks the caller's role. Clients can only read.
-- The first admin is added by hand in the SQL Editor (not in this file: the repo is public).

-- 1) Roles
create table if not exists public.staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'moderator')),
  created_by uuid,
  created_at timestamptz not null default now()
);

create or replace function public.is_staff(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.staff_roles s where s.user_id = uid) $$;

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.staff_roles s where s.user_id = uid and s.role = 'admin') $$;

alter table public.staff_roles enable row level security;
drop policy if exists staff_roles_select on public.staff_roles;
create policy staff_roles_select on public.staff_roles
  for select to authenticated using (user_id = auth.uid() or public.is_staff());

-- 2) Bans (until null = permanent)
create table if not exists public.user_bans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  until timestamptz,
  reason text not null,
  action_id uuid,
  banned_by uuid,
  created_at timestamptz not null default now()
);

create or replace function public.user_is_banned(uid uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_bans b where b.user_id = uid and (b.until is null or b.until > now())) $$;

alter table public.user_bans enable row level security;
drop policy if exists user_bans_select on public.user_bans;
create policy user_bans_select on public.user_bans
  for select to authenticated using (user_id = auth.uid() or public.is_staff());

-- 3) Action log (append-only: no client write policies at all)
create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  target_user uuid,
  target_name text,
  target_email text,
  actor_id uuid not null,
  actor_name text,
  action text not null check (action in ('warn', 'suspend', 'ban', 'unban', 'dismiss', 'role_add', 'role_remove')),
  reason text,
  note text,
  evidence text[] not null default '{}',
  report_ids uuid[] not null default '{}',
  until timestamptz,
  email_sent boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists moderation_actions_created_idx on public.moderation_actions (created_at desc);
create index if not exists moderation_actions_target_idx on public.moderation_actions (target_user, created_at desc);

alter table public.moderation_actions enable row level security;
drop policy if exists moderation_actions_select on public.moderation_actions;
create policy moderation_actions_select on public.moderation_actions
  for select to authenticated using (public.is_staff());

-- 4) Reports: status + context (reported message / plan). The reported person no longer sees reports about them.
alter table public.user_reports add column if not exists status text not null default 'open';
alter table public.user_reports add column if not exists resolved_by uuid;
alter table public.user_reports add column if not exists resolved_at timestamptz;
alter table public.user_reports add column if not exists context jsonb;
alter table public.user_reports drop constraint if exists user_reports_status_check;
alter table public.user_reports add constraint user_reports_status_check check (status in ('open', 'resolved'));
create index if not exists user_reports_open_idx on public.user_reports (status, created_at desc);

drop policy if exists user_reports_select_own on public.user_reports;
create policy user_reports_select_own on public.user_reports
  for select to authenticated using (reporter_id = auth.uid() or public.is_staff());

drop policy if exists user_reports_insert_own on public.user_reports;
create policy user_reports_insert_own on public.user_reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'open' and resolved_by is null and resolved_at is null);

-- 5) Staff can read all blocks (how many people blocked someone, and why).
drop policy if exists blocks_select_staff on public.blocks;
create policy blocks_select_staff on public.blocks
  for select to authenticated using (public.is_staff());

-- 6) Banned people disappear for everyone except themselves and staff.
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles
  for select using (
    deleted_at is null
    and (id = auth.uid() or not public.user_is_banned(id) or public.is_staff())
  );

-- 7) Evidence screenshots: private bucket, staff only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('moderation-evidence', 'moderation-evidence', false, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

drop policy if exists moderation_evidence_insert on storage.objects;
create policy moderation_evidence_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'moderation-evidence' and public.is_staff());

drop policy if exists moderation_evidence_select on storage.objects;
create policy moderation_evidence_select on storage.objects
  for select to authenticated using (bucket_id = 'moderation-evidence' and public.is_staff());

-- 8) Notification types for staff alerts and warnings to users.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('like', 'match', 'message', 'friend_request', 'system', 'plan_join', 'plan_accept', 'birthday_wish', 'report', 'moderation'));

grant execute on function public.is_staff(uuid) to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.user_is_banned(uuid) to authenticated;
