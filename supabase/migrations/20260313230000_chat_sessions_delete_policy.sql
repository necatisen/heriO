-- Katılımcılar kendi sohbet oturumunu silebilir (kişi bazlı tüm sohbet silinir)
create policy "chat_sessions_delete_participant"
on public.chat_sessions for delete to authenticated
using (auth.uid() = user1_id or auth.uid() = user2_id);
