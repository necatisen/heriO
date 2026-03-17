-- Profil popup'ta başka kullanıcının galerisini gösterebilmek için: tüm kullanıcılar photos tablosunu okuyabilsin
drop policy if exists "Users can view own photos" on public.photos;
create policy "Users can view any photos"
on public.photos for select to authenticated
using (true);
