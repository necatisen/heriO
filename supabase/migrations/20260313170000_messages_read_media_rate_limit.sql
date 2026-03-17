/*
  Mesajlaşma iyileştirmeleri:
  - read_at (okundu zamanı); is_read zaten var
  - attachment_url (medya mesajları için)
  - Rate limit: dakikada max mesaj
  - İndeksler
*/
begin;

-- read_at ekle (is_read ile birlikte kullanılacak)
alter table public.messages
  add column if not exists read_at timestamptz;

-- medya için attachment alanı (resim/video URL Supabase Storage)
alter table public.messages
  add column if not exists attachment_url text;

alter table public.messages
  add column if not exists attachment_type text check (attachment_type is null or attachment_type in ('image', 'video'));

-- indeksler
create index if not exists idx_messages_session_created
  on public.messages(session_id, created_at asc);
create index if not exists idx_messages_receiver_read
  on public.messages(receiver_id, is_read, read_at) where is_read = false;

-- Şikâyet kayıtları (kötüye kullanım; sıkı rate limit için)
create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz default now(),
  unique(reporter_id, reported_user_id)
);
create index if not exists idx_user_reports_reported on public.user_reports(reported_user_id);
alter table public.user_reports enable row level security;
drop policy if exists "user_reports_insert_own" on public.user_reports;
create policy "user_reports_insert_own" on public.user_reports for insert to authenticated
  with check (reporter_id = auth.uid());
drop policy if exists "user_reports_select_own" on public.user_reports;
create policy "user_reports_select_own" on public.user_reports for select to authenticated
  using (reporter_id = auth.uid() or reported_user_id = auth.uid());

-- Rate limit: normal 30/dk; şikâyet edilmiş kullanıcılar 5/dk
create or replace function public.check_message_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_limit integer := 30;
  v_report_count integer;
begin
  select count(*) into v_report_count
  from public.user_reports
  where reported_user_id = new.sender_id;

  if v_report_count >= 1 then
    v_limit := 5;
  end if;

  select count(*) into v_count
  from public.messages
  where sender_id = new.sender_id
    and created_at > now() - interval '1 minute';

  if v_count >= v_limit then
    raise exception 'Message rate limit exceeded. Please wait a moment.';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_rate_limit_trigger on public.messages;
create trigger messages_rate_limit_trigger
  before insert on public.messages
  for each row execute function public.check_message_rate_limit();

commit;
