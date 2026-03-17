/*
  Profiles: filter columns + indexes for Keşfet performance
  - latitude, longitude (konum tabanlı keşif)
  - body_type, alcohol_consumption, smoking_habit, children_status, is_verified
  - languages (text[] for multi-select)
*/
begin;

-- Add columns if missing
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'latitude') then
    alter table public.profiles add column latitude double precision;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'longitude') then
    alter table public.profiles add column longitude double precision;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'body_type') then
    alter table public.profiles add column body_type text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'alcohol_consumption') then
    alter table public.profiles add column alcohol_consumption text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'smoking_habit') then
    alter table public.profiles add column smoking_habit text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'children_status') then
    alter table public.profiles add column children_status text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_verified') then
    alter table public.profiles add column is_verified boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'languages') then
    alter table public.profiles add column languages text[] default '{}';
  end if;
end $$;

-- Indexes for filter performance
create index if not exists idx_profiles_gender on public.profiles(gender);
create index if not exists idx_profiles_birth_date on public.profiles(birth_date);
create index if not exists idx_profiles_height on public.profiles(height);
create index if not exists idx_profiles_body_type on public.profiles(body_type);
create index if not exists idx_profiles_religion on public.profiles(religion);
create index if not exists idx_profiles_city on public.profiles(city);
create index if not exists idx_profiles_is_online on public.profiles(is_online);
create index if not exists idx_profiles_is_verified on public.profiles(is_verified) where is_verified = true;
create index if not exists idx_profiles_location on public.profiles(latitude, longitude) where latitude is not null and longitude is not null;

commit;
