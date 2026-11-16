import { supabase } from '@/lib/supabase';

import { L } from '@/lib/l10n';
export type Match = {
  id: string;
  full_name: string;
  profile_picture: string | null;
};

export type Conversation = {
  id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_picture: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
};

/**
 * Loads matches + conversations for the chat list in two network round trips:
 * 1) friends, sessions (with last message), unread rows and blocks in parallel
 * 2) all needed profiles in a single IN query.
 */
export async function loadChatList(
  userId: string,
  language: string
): Promise<{ matches: Match[]; conversations: Conversation[] } | null> {
  const [friendsRes, sessionsRes, unreadRes, blocksRes] = await Promise.all([
    supabase.from('friends').select('friend_id').eq('user_id', userId).eq('status', 'accepted'),
    supabase
      .from('chat_sessions')
      .select('id, user1_id, user2_id, started_at, messages(content, created_at, attachment_url, attachment_type)')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .order('created_at', { referencedTable: 'messages', ascending: false })
      .limit(1, { referencedTable: 'messages' }),
    supabase.from('messages').select('session_id').eq('receiver_id', userId).eq('is_read', false),
    supabase.from('blocks').select('user_id, blocked_user_id').or(`user_id.eq.${userId},blocked_user_id.eq.${userId}`),
  ]);

  if (sessionsRes.error) {
    console.error('Error fetching conversations:', sessionsRes.error);
    return null;
  }
  const sessions = (sessionsRes.data || []) as any[];

  const blocked = new Set<string>();
  (blocksRes.data || []).forEach((b: any) => blocked.add(b.user_id === userId ? b.blocked_user_id : b.user_id));

  const unreadBySession: Record<string, number> = {};
  (unreadRes.data || []).forEach((r: any) => {
    if (r?.session_id) unreadBySession[r.session_id] = (unreadBySession[r.session_id] || 0) + 1;
  });

  const otherOf = (s: any) => (s.user1_id === userId ? s.user2_id : s.user1_id);
  const chatPartnerIds = new Set(sessions.map(otherOf));
  const matchIds = (friendsRes.data || [])
    .map((f: any) => f.friend_id as string)
    .filter((id) => !chatPartnerIds.has(id) && !blocked.has(id));

  const profileIds = Array.from(new Set([...chatPartnerIds, ...matchIds])).filter(Boolean);
  const { data: profiles } = profileIds.length
    ? await supabase.from('profiles').select('id, full_name, profile_picture').in('id', profileIds)
    : { data: [] as any[] };
  const byId: Record<string, Match> = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));

  const isTr = language === 'tr';
  const conversations: Conversation[] = sessions
    .filter((s) => !blocked.has(otherOf(s)))
    .map((s) => {
      const other = otherOf(s);
      const last = (s.messages || [])[0];
      let text = L('Henüz mesaj yok', 'No messages yet');
      if (last?.attachment_url && (last.attachment_type === 'image' || !last.attachment_type)) text = L('📷 Fotoğraf', '📷 Photo');
      else if (last?.content) text = last.content;
      return {
        id: s.id,
        other_user_id: other,
        other_user_name: byId[other]?.full_name || (L('Kullanıcı', 'User')),
        other_user_picture: byId[other]?.profile_picture || null,
        last_message: text,
        last_message_time: last?.created_at || s.started_at,
        unread_count: unreadBySession[s.id] || 0,
      };
    })
    .sort((a, b) => (new Date(b.last_message_time).getTime() || 0) - (new Date(a.last_message_time).getTime() || 0));

  const matches = matchIds.map((id) => byId[id]).filter(Boolean);
  return { matches, conversations };
}
