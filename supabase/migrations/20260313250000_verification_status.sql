-- Verification status: badge controlled by status, not by photo upload
-- Values: unverified (default), pending, verified, rejected

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'verification_status'
  ) then
    alter table public.profiles
      add column verification_status text not null default 'unverified'
      check (verification_status in ('unverified', 'pending', 'verified', 'rejected'));
  end if;
end $$;

create index if not exists idx_profiles_verification_status
  on public.profiles(verification_status) where verification_status = 'verified';

-- Admin-only: set verification status (for backend/admin use)
-- Uses SECURITY DEFINER so it can update any profile; restrict who can call via RLS or use service role.
create or replace function public.set_verification_status(
  target_user_id uuid,
  new_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if new_status not in ('unverified', 'pending', 'verified', 'rejected') then
    raise invalid_parameter_value using message = 'Invalid verification_status';
  end if;
  update public.profiles
  set verification_status = new_status
  where id = target_user_id;
end;
$$;

comment on function public.set_verification_status(uuid, text) is
  'Admin: set user verification status. Call with service role or from trusted backend.';

-- Restrict RPC to service_role only (backend/admin). Authenticated users cannot call it.
revoke execute on function public.set_verification_status(uuid, text) from anon;
revoke execute on function public.set_verification_status(uuid, text) from authenticated;
grant execute on function public.set_verification_status(uuid, text) to service_role;
