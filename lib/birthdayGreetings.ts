/**
 * Birthday privacy (profiles.share_birthday) and greetings between birthday twins
 * (table birthday_greetings, migration 20261123120000).
 * A greeting never opens a chat by itself: the receiver "thanks" it, which opens the chat from their side.
 */
import { supabase } from '@/lib/supabase';
import { cleanPlanText } from '@/lib/plans';
import { openChatBetween } from '@/lib/likeUser';

export type GreetingKind = 'wish' | 'hello';

export type Greeting = {
  id: string;
  from_user: string;
  to_user: string;
  year: number;
  kind: GreetingKind;
  note: string | null;
  thanked_at: string | null;
  created_at: string;
  sender?: { id: string; full_name: string; profile_picture: string | null; verification_status: string | null };
};

export const GREETING_NOTE_MAX = 140;

/** Whether the user shares their birthday (false if the column does not exist yet). */
export async function loadShareBirthday(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data, error } = await supabase.from('profiles').select('share_birthday').eq('id', userId).maybeSingle();
    if (error || !data) return false;
    return !!(data as any).share_birthday;
  } catch {
    return false;
  }
}

export async function saveShareBirthday(userId: string, value: boolean): Promise<void> {
  const { error } = await supabase.from('profiles').update({ share_birthday: value }).eq('id', userId);
  if (error) throw error;
}

/** Ids of twins I already greeted this year. */
export async function loadSentGreetingIds(myId: string): Promise<Set<string>> {
  try {
    const { data } = await supabase
      .from('birthday_greetings')
      .select('to_user')
      .eq('from_user', myId)
      .eq('year', new Date().getFullYear());
    return new Set(((data as any[]) || []).map((r) => r.to_user));
  } catch {
    return new Set();
  }
}

export async function sendGreeting(myId: string, myName: string, toId: string, kind: GreetingKind, rawNote: string): Promise<void> {
  const note = cleanPlanText(rawNote).slice(0, GREETING_NOTE_MAX);
  const { error } = await supabase.from('birthday_greetings').insert({ from_user: myId, to_user: toId, kind, note: note || null });
  if (error) {
    if (error.code === '23505') throw new Error('already');
    throw error;
  }
  await supabase
    .from('notifications')
    .insert({ user_id: toId, actor_user_id: myId, type: 'birthday_wish', data: { kind, actor_name: myName } })
    .then(() => {}, () => {});
  void supabase.functions
    .invoke('send-push-message', { body: { kind: 'birthday_wish', to_user_id: toId, data: { type: 'birthday_wish' } } })
    .catch(() => {});
}

/** Greetings I received this year, newest first, with the sender's profile. Empty if the table is missing. */
export async function loadReceivedGreetings(myId: string): Promise<Greeting[]> {
  try {
    const { data, error } = await supabase
      .from('birthday_greetings')
      .select('*')
      .eq('to_user', myId)
      .eq('year', new Date().getFullYear())
      .order('created_at', { ascending: false })
      .limit(50);
    if (error || !data?.length) return [];
    const ids = Array.from(new Set((data as Greeting[]).map((g) => g.from_user)));
    const { data: people } = await supabase
      .from('profiles')
      .select('id, full_name, profile_picture, verification_status')
      .in('id', ids);
    const byId = new Map(((people as any[]) || []).map((p) => [p.id, p]));
    return (data as Greeting[]).map((g) => ({ ...g, sender: byId.get(g.from_user) })).filter((g) => g.sender);
  } catch {
    return [];
  }
}

/** Thank a greeting: opens the chat between the two people and tells the sender. Returns the chat session id. */
export async function thankGreeting(g: Greeting, myId: string): Promise<string | undefined> {
  const { error } = await supabase.from('birthday_greetings').update({ thanked_at: new Date().toISOString() }).eq('id', g.id);
  if (error) throw error;
  const sessionId = await openChatBetween(myId, g.from_user);
  void supabase.functions
    .invoke('send-push-message', {
      body: { kind: 'birthday_thanks', to_user_id: g.from_user, data: { type: 'birthday_thanks', session_id: sessionId } },
    })
    .catch(() => {});
  return sessionId;
}

export async function deleteGreeting(id: string): Promise<void> {
  const { error } = await supabase.from('birthday_greetings').delete().eq('id', id);
  if (error) throw error;
}
