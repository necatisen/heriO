/*
  blocks: Mevcut tablo user_id (engelleyen) + blocked_user_id kullanıyor.
  Sadece eksik indeksi ekleyip politikaları güncelliyoruz.
  user_reports zaten 20260313170000'de var.
*/
begin;

-- blocks tablosu zaten eski migration'da var (user_id, blocked_user_id).
-- Eksik indeks (blocked_user_id üzerinden filtre için)
create index if not exists idx_blocks_blocked on public.blocks(blocked_user_id);
create index if not exists idx_blocks_blocker on public.blocks(user_id);

alter table public.blocks enable row level security;

-- Eski policy isimlerini kaldır
drop policy if exists "Users can view own blocks" on public.blocks;
drop policy if exists "Users can block users" on public.blocks;
drop policy if exists "Users can unblock users" on public.blocks;
drop policy if exists "blocks_insert_own" on public.blocks;
drop policy if exists "blocks_select_own" on public.blocks;
drop policy if exists "blocks_delete_own" on public.blocks;

-- Yeni politikalar (user_id = engelleyen)
create policy "blocks_insert_own" on public.blocks for insert to authenticated
  with check (user_id = auth.uid());

create policy "blocks_select_own" on public.blocks for select to authenticated
  using (user_id = auth.uid() or blocked_user_id = auth.uid());

create policy "blocks_delete_own" on public.blocks for delete to authenticated
  using (user_id = auth.uid());

-- user_reports: reason kategorisi (opsiyonel) - mevcut reason text zaten var
commit;
