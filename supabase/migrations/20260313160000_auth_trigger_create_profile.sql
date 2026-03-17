/*
  Create profile (and subscription) when a new auth user is created.
  This avoids RLS blocking profile insert when email confirmation is on
  (no session yet) or when the client runs the insert before session is set.
  Sign-up metadata must be passed in signUp({ options: { data: { full_name, username, ... } } }).
*/
begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  v_username := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
    'user_' || substr(replace(new.id::text, '-', ''), 1, 12)
  );

  insert into public.profiles (
    id,
    full_name,
    username,
    bio,
    birth_date,
    gender,
    country,
    city,
    district,
    height,
    weight,
    preferred_language,
    religion,
    profession,
    relationship_status,
    education,
    body_type,
    children_status,
    smoking_habit,
    alcohol_consumption
  ) values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'User'),
    v_username,
    coalesce(new.raw_user_meta_data ->> 'bio', ''),
    coalesce((new.raw_user_meta_data ->> 'birth_date')::date, '2000-01-01'::date),
    coalesce(new.raw_user_meta_data ->> 'gender', 'other'),
    coalesce(new.raw_user_meta_data ->> 'country', 'Turkey'),
    nullif(trim(new.raw_user_meta_data ->> 'city'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'district'), ''),
    (new.raw_user_meta_data ->> 'height')::integer,
    (new.raw_user_meta_data ->> 'weight')::integer,
    coalesce(new.raw_user_meta_data ->> 'preferred_language', 'tr'),
    nullif(trim(new.raw_user_meta_data ->> 'religion'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'profession'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'relationship_status'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'education'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'body_type'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'children_status'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'smoking_habit'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'alcohol_consumption'), '')
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, is_premium)
  values (new.id, false)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

commit;
