-- 1) Payments switch: OFF until Google Play Billing is integrated (app shows no store, everyone gets full access).
--    Turn on later: update public.app_config set value = 'true', updated_at = now() where key = 'payments_enabled';
insert into public.app_config (key, value)
values ('payments_enabled', 'false')
on conflict (key) do nothing;

-- 2) Clients can no longer grant themselves premium or credits (the old "fake payment" wrote these tables directly).
--    Rows are written only by SECURITY DEFINER functions (initial credits trigger, deduct_credits) or the service role
--    (later: verified Google Play purchases).
drop policy if exists "subscriptions_insert_own" on public.subscriptions;
drop policy if exists "subscriptions_update_own" on public.subscriptions;
drop policy if exists "credits_insert_own" on public.credits;
drop policy if exists "credits_update_own" on public.credits;
drop policy if exists "credit_transactions_insert_own" on public.credit_transactions;
revoke insert, update, delete on public.subscriptions from anon, authenticated;
revoke insert, update, delete on public.credits from anon, authenticated;
revoke insert, update, delete on public.credit_transactions from anon, authenticated;

-- 3) Consent records (KVKK proof). Append-only for clients: insert + read own rows, no update/delete.
create table if not exists public.user_consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null check (consent_type in ('terms_privacy', 'kvkk_notice', 'transfer_abroad', 'biometric')),
  version text not null,
  granted boolean not null default true,
  app_version_code int,
  created_at timestamptz not null default now()
);
create index if not exists idx_user_consents_user on public.user_consents(user_id, consent_type);

alter table public.user_consents enable row level security;

drop policy if exists "user_consents_insert_own" on public.user_consents;
create policy "user_consents_insert_own" on public.user_consents
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "user_consents_select_own" on public.user_consents;
create policy "user_consents_select_own" on public.user_consents
  for select to authenticated using (user_id = auth.uid());

revoke update, delete on public.user_consents from anon, authenticated;
grant select, insert on public.user_consents to authenticated;

-- 4) Email sign-ups have no session before confirming their email, so the app sends the ticked consents in
--    user_metadata.consents = { version, accepted_at, app_version_code, types[] }; copy them on account creation.
create or replace function public.record_signup_consents()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  c jsonb := new.raw_user_meta_data -> 'consents';
  t text;
begin
  if c is null or jsonb_typeof(c -> 'types') <> 'array' then
    return new;
  end if;
  for t in select jsonb_array_elements_text(c -> 'types') loop
    if t in ('terms_privacy', 'kvkk_notice', 'transfer_abroad', 'biometric') then
      insert into public.user_consents (user_id, consent_type, version, granted, app_version_code, created_at)
      values (
        new.id,
        t,
        coalesce(c ->> 'version', 'unknown'),
        true,
        nullif(c ->> 'app_version_code', '')::int,
        coalesce(nullif(c ->> 'accepted_at', '')::timestamptz, now())
      );
    end if;
  end loop;
  return new;
exception when others then
  -- Never block sign-up because of the consent log.
  raise warning 'record_signup_consents failed: %', sqlerrm;
  return new;
end;
$$;

revoke all on function public.record_signup_consents() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_record_consents on auth.users;
create trigger on_auth_user_created_record_consents
  after insert on auth.users
  for each row execute function public.record_signup_consents();
