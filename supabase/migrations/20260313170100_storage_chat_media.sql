/*
  chat-media bucket: mesaj ekleri (resim/video) için.
  Private bucket; sadece giriş yapmış kullanıcılar yükleyebilir/indirebilir.
*/
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Sadece giriş yapmış kullanıcılar chat-media içine dosya ekleyebilir
drop policy if exists "chat_media_insert_authenticated" on storage.objects;
create policy "chat_media_insert_authenticated"
on storage.objects for insert
to authenticated
with check (bucket_id = 'chat-media');

-- Giriş yapmış kullanıcılar chat-media dosyalarını okuyabilir (sohbet katılımcıları)
drop policy if exists "chat_media_select_authenticated" on storage.objects;
create policy "chat_media_select_authenticated"
on storage.objects for select
to authenticated
using (bucket_id = 'chat-media');

-- Yükleyen kullanıcı kendi yüklediği dosyayı silebilir
drop policy if exists "chat_media_delete_own" on storage.objects;
create policy "chat_media_delete_own"
on storage.objects for delete
to authenticated
using (bucket_id = 'chat-media' and owner = auth.uid());
