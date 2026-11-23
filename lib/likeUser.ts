/**
 * Like someone from anywhere (birthday twins, …): saves the like, notifies them and creates the match
 * (friends + chat session) when the like is mutual. Same rules as the Explore deck.
 */
import { supabase } from '@/lib/supabase';
import { sendLikePush } from '@/lib/pushNotifications';

export type LikeResult = { matched: boolean; sessionId?: string; alreadyLiked?: boolean };

/** Makes the two people friends and returns their active chat session (created if missing). */
export async function openChatBetween(myId: string, otherId: string): Promise<string | undefined> {
  for (const [a, b] of [
    [myId, otherId],
    [otherId, myId],
  ]) {
    const { error } = await supabase.from('friends').insert({ user_id: a, friend_id: b, status: 'accepted' });
    if (error && error.code !== '23505') console.error('friends insert', error);
  }
  const pair = `and(user1_id.eq.${myId},user2_id.eq.${otherId}),and(user1_id.eq.${otherId},user2_id.eq.${myId})`;
  const { data: existing } = await supabase.from('chat_sessions').select('id').or(pair).eq('status', 'active').maybeSingle();
  if (existing?.id) return existing.id;
  const { data: created } = await supabase
    .from('chat_sessions')
    .insert({ user1_id: myId, user2_id: otherId, status: 'active' })
    .select('id')
    .single();
  return created?.id;
}

export async function likeUser(myId: string, myName: string, otherId: string, otherName: string): Promise<LikeResult> {
  const { error: likeError } = await supabase.from('likes').insert({ user_id: myId, liked_user_id: otherId });
  const alreadyLiked = likeError?.code === '23505';
  if (likeError && !alreadyLiked) throw likeError;

  const { data: mutual } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', otherId)
    .eq('liked_user_id', myId)
    .maybeSingle();

  if (!mutual) {
    if (!alreadyLiked) {
      await supabase.from('notifications').insert({ user_id: otherId, actor_user_id: myId, type: 'like', data: { actor_name: myName } });
      sendLikePush(otherId, 'like');
    }
    return { matched: false, alreadyLiked };
  }

  const sessionId = await openChatBetween(myId, otherId);

  await supabase.from('notifications').insert({ user_id: otherId, actor_user_id: myId, type: 'match', data: { matched_user_name: otherName } });
  sendLikePush(otherId, 'match', sessionId);
  return { matched: true, sessionId };
}
