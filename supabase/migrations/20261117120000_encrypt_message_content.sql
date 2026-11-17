-- Message text is stored encrypted in the database (OpenPGP symmetric, AES-256).
-- The key lives in Supabase Vault; only the two people in a chat can get the plain text,
-- through get_message_texts(). Stored form: 'enc1:' || base64(ciphertext).

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'message_encryption_key') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'base64'),
      'message_encryption_key',
      'Key for public.messages.content encryption'
    );
  end if;
end $$;

create or replace function private.message_key()
returns text language sql stable security definer set search_path = ''
as $$ select decrypted_secret from vault.decrypted_secrets where name = 'message_encryption_key' limit 1 $$;

create or replace function private.encrypt_message(p text)
returns text language plpgsql security definer set search_path = ''
as $$
begin
  if p is null or p = '' or p like 'enc1:%' then return p; end if;
  return 'enc1:' || replace(encode(extensions.pgp_sym_encrypt(p, private.message_key(), 'cipher-algo=aes256'), 'base64'), E'\n', '');
end $$;

create or replace function private.decrypt_message(p text)
returns text language plpgsql stable security definer set search_path = ''
as $$
begin
  if p is null or p not like 'enc1:%' then return p; end if; -- rows written before encryption
  return extensions.pgp_sym_decrypt(decode(substr(p, 6), 'base64'), private.message_key());
exception when others then
  return null;
end $$;

revoke all on function private.message_key() from public, anon, authenticated;
revoke all on function private.encrypt_message(text) from public, anon, authenticated;
revoke all on function private.decrypt_message(text) from public, anon, authenticated;

-- Encrypt on every insert and on content edits (also covers "message deleted" text).
create or replace function private.messages_encrypt_content()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.content is distinct from old.content then
    new.content := private.encrypt_message(new.content);
  end if;
  return new;
end $$;

drop trigger if exists trg_messages_encrypt_content on public.messages;
create trigger trg_messages_encrypt_content
  before insert or update of content on public.messages
  for each row execute function private.messages_encrypt_content();

-- Plain text for the caller's own chats only (by message id).
create or replace function public.get_message_texts(p_ids uuid[])
returns table (id uuid, content text)
language sql stable security definer set search_path = ''
as $$
  select m.id, private.decrypt_message(m.content)
  from public.messages m
  join public.chat_sessions s on s.id = m.session_id
  where m.id = any (p_ids)
    and auth.uid() is not null
    and auth.uid() in (s.user1_id, s.user2_id)
$$;
revoke all on function public.get_message_texts(uuid[]) from public, anon;
grant execute on function public.get_message_texts(uuid[]) to authenticated;

-- Encrypt messages written before this migration.
update public.messages set content = private.encrypt_message(content)
where content is not null and content <> '' and content not like 'enc1:%';
