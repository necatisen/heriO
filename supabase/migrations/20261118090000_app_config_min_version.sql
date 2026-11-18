-- Remote app settings readable by every client; changed only from SQL / service role.
-- android_min_version_code: installs with a lower versionCode see a blocking "update the app" screen.
-- Raise it only after the new version is live on Google Play, e.g.:
--   update public.app_config set value = '12', updated_at = now() where key = 'android_min_version_code';

create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

drop policy if exists "app_config_select_all" on public.app_config;
create policy "app_config_select_all" on public.app_config
  for select to anon, authenticated using (true);

revoke insert, update, delete on public.app_config from anon, authenticated;
grant select on public.app_config to anon, authenticated;

-- v11 is the first build that contains the check, so 11 blocks nobody yet.
insert into public.app_config (key, value)
values ('android_min_version_code', '11')
on conflict (key) do nothing;

-- Push registration diagnostics: last outcome of registerPushToken() per user/device platform.
create table if not exists public.push_diagnostics (
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  stage text not null,          -- ok | not_device | permission_denied | token_failed | save_failed | error
  detail text,
  app_version_code int,
  updated_at timestamptz not null default now(),
  primary key (user_id, platform)
);

alter table public.push_diagnostics enable row level security;

drop policy if exists "push_diagnostics_own" on public.push_diagnostics;
create policy "push_diagnostics_own" on public.push_diagnostics
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
