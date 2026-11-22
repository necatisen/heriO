-- Extra profile details: hobbies/interests, pets, exercise habit (lib/profileExtras.ts).
alter table public.profiles add column if not exists interests text[] not null default '{}';
alter table public.profiles add column if not exists pets text;
alter table public.profiles add column if not exists exercise text;

alter table public.profiles drop constraint if exists profiles_interests_max;
alter table public.profiles add constraint profiles_interests_max check (coalesce(array_length(interests, 1), 0) <= 10);
