-- message_reactions: mesaj balonuna emoji tepkisi (beğeni)
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  unique(message_id, user_id)
);

create index if not exists idx_message_reactions_message_id on public.message_reactions(message_id);

alter table public.message_reactions enable row level security;

-- Sadece sohbet oturumuna dahil kullanıcılar okuyabilir
create policy "message_reactions_select_session"
on public.message_reactions for select to authenticated
using (
  exists (
    select 1 from public.messages m
    join public.chat_sessions cs on cs.id = m.session_id
    where m.id = message_reactions.message_id
      and (auth.uid() = cs.user1_id or auth.uid() = cs.user2_id)
  )
);

-- Sadece oturum katılımcısı kendi tepkisini ekleyebilir/güncelleyebilir
create policy "message_reactions_insert_own"
on public.message_reactions for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.messages m
    join public.chat_sessions cs on cs.id = m.session_id
    where m.id = message_reactions.message_id
      and (auth.uid() = cs.user1_id or auth.uid() = cs.user2_id)
  )
);

create policy "message_reactions_update_own"
on public.message_reactions for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "message_reactions_delete_own"
on public.message_reactions for delete to authenticated
using (user_id = auth.uid());

-- Realtime için yayına ekle (isteğe bağlı; eklenmezse tepkiler sayfa yenilenince gelir)
alter publication supabase_realtime add table public.message_reactions;
