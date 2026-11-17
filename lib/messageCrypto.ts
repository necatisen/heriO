import { supabase } from '@/lib/supabase';

/**
 * Message text is stored encrypted in the database ('enc1:…', see migration
 * 20261117120000_encrypt_message_content.sql). The app writes plain text (a DB trigger
 * encrypts it) and asks the server for the plain text of messages in its own chats.
 */
export const isEncrypted = (s: unknown): s is string => typeof s === 'string' && s.startsWith('enc1:');

type Row = { id: string; content?: string | null };

/** Replaces encrypted content with plain text, in one request per 200 messages. */
export async function decryptMessages<T extends Row>(rows: T[]): Promise<T[]> {
  const ids = Array.from(new Set(rows.filter((r) => r?.id && isEncrypted(r.content)).map((r) => r.id)));
  if (ids.length === 0) return rows;
  const plain = new Map<string, string | null>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase.rpc('get_message_texts', { p_ids: ids.slice(i, i + 200) });
    if (error) console.warn('decryptMessages failed:', error.message);
    (data || []).forEach((d: { id: string; content: string | null }) => plain.set(d.id, d.content));
  }
  // Never show ciphertext: unreadable rows become empty text.
  return rows.map((r) => (isEncrypted(r.content) ? { ...r, content: plain.get(r.id) ?? '' } : r));
}

export async function decryptMessage<T extends Row>(row: T): Promise<T> {
  return (await decryptMessages([row]))[0];
}
