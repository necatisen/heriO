-- Verification badge hardening
-- 1) Only the server (service_role / SQL) may change verification_status / is_verified / face_verified.
--    Before this, any signed-in user could set their own row to 'verified' via a plain UPDATE,
--    and set_verification_status() was executable by anon/authenticated for ANY user.
-- 2) Changing the profile photo removes the badge: the selfie was matched against the old photo.

revoke execute on function public.set_verification_status(uuid, text) from public, anon, authenticated;
grant execute on function public.set_verification_status(uuid, text) to service_role;

create or replace function public.protect_verification_fields()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_client boolean := coalesce(auth.role(), '') in ('anon', 'authenticated');
begin
  if tg_op = 'INSERT' then
    if v_client then
      new.verification_status := 'unverified';
      new.is_verified := false;
      new.face_verified := false;
    end if;
    return new;
  end if;

  -- UPDATE: clients can never change the badge fields themselves.
  if v_client then
    new.verification_status := old.verification_status;
    new.is_verified := old.is_verified;
    new.face_verified := old.face_verified;
  end if;

  -- New profile photo → badge removed, user must verify again with the new photo.
  if new.profile_picture is distinct from old.profile_picture
     and old.verification_status in ('verified', 'pending') then
    new.verification_status := 'unverified';
    new.is_verified := false;
    new.face_verified := false;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_verification on public.profiles;
create trigger trg_profiles_protect_verification
  before insert or update on public.profiles
  for each row execute function public.protect_verification_fields();
