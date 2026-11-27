/**
 * "Plan ile tanış" data layer (tables from migration 20261122150000_plans.sql).
 * A plan is a concrete activity; others ask to join; the owner accepts → a chat opens between them.
 */
import { supabase } from '@/lib/supabase';
import { L } from '@/lib/l10n';
import { maskBadWords } from '@/lib/moderation';
import { sanitizeSocialAndContacts } from '@/lib/textSanitizer';
import { submitUserReport } from '@/lib/staff';

export type PlanCategory = 'coffee' | 'food' | 'walk' | 'sport' | 'concert' | 'cinema' | 'culture' | 'games' | 'travel' | 'other';

export const PLAN_CATEGORIES: { value: PlanCategory; emoji: string; tr: string; en: string; interests: string[] }[] = [
  { value: 'coffee', emoji: '☕', tr: 'Kahve', en: 'Coffee', interests: ['coffee'] },
  { value: 'food', emoji: '🍽️', tr: 'Yemek', en: 'Food', interests: ['food', 'cooking'] },
  { value: 'walk', emoji: '🚶', tr: 'Yürüyüş', en: 'Walk', interests: ['hiking', 'nature', 'sea', 'running'] },
  { value: 'sport', emoji: '🏃', tr: 'Spor', en: 'Sport', interests: ['fitness', 'running', 'yoga', 'football', 'basketball', 'swimming', 'cycling'] },
  { value: 'concert', emoji: '🎵', tr: 'Konser', en: 'Concert', interests: ['music', 'concerts', 'dancing'] },
  { value: 'cinema', emoji: '🎬', tr: 'Sinema', en: 'Cinema', interests: ['movies'] },
  { value: 'culture', emoji: '🎭', tr: 'Sanat / Kültür', en: 'Art / Culture', interests: ['art', 'theatre', 'photography', 'reading'] },
  { value: 'games', emoji: '🎲', tr: 'Oyun', en: 'Games', interests: ['board_games', 'gaming'] },
  { value: 'travel', emoji: '✈️', tr: 'Gezi', en: 'Trip', interests: ['travel', 'camping'] },
  { value: 'other', emoji: '✨', tr: 'Diğer', en: 'Other', interests: [] },
];

export const categoryLabel = (c: string) => {
  const o = PLAN_CATEGORIES.find((x) => x.value === c) ?? PLAN_CATEGORIES[PLAN_CATEGORIES.length - 1];
  return `${o.emoji} ${L(o.tr, o.en)}`;
};

export const MAX_OPEN_PLANS = 3;

export type PlanOwner = {
  id: string;
  full_name: string;
  profile_picture: string | null;
  birth_date: string | null;
  city: string | null;
  verification_status: string | null;
  relationship_goal?: string | null;
  smoking_habit?: string | null;
  alcohol_consumption?: string | null;
  religion?: string | null;
  children_status?: string | null;
  education?: string | null;
  country?: string | null;
};

export type Plan = {
  id: string;
  user_id: string;
  category: PlanCategory;
  title: string;
  place: string | null;
  city: string | null;
  country: string | null;
  starts_at: string;
  status: 'open' | 'cancelled';
  created_at: string;
  /** Set when the owner edited title / place / time (migration 20261127120000). */
  edited_at?: string | null;
  edit_count?: number;
  owner?: PlanOwner;
  /** Pending + accepted requests (owner sees all; others only their own row). */
  joins?: PlanJoin[];
  myJoin?: PlanJoin | null;
};

export type PlanJoin = {
  id: string;
  plan_id: string;
  user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  user?: PlanOwner;
};

const OWNER_FIELDS =
  'id, full_name, profile_picture, birth_date, city, country, verification_status, relationship_goal, smoking_habit, alcohol_consumption, religion, children_status, education';

/** Upcoming open plans of other people + the caller's own plans (with their requests). */
export async function loadPlans(myId: string): Promise<{ feed: Plan[]; mine: Plan[] }> {
  const since = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .gte('starts_at', since)
    .order('starts_at', { ascending: true })
    .limit(200);
  if (error) throw error;
  const plans = ((data as Plan[]) || []).filter((p) => p.status === 'open');
  const ids = plans.map((p) => p.id);
  const ownerIds = Array.from(new Set(plans.map((p) => p.user_id)));

  const [{ data: owners }, { data: joins }] = await Promise.all([
    ownerIds.length ? supabase.from('profiles').select(OWNER_FIELDS).in('id', ownerIds) : Promise.resolve({ data: [] as any[] } as any),
    ids.length ? supabase.from('plan_joins').select('*').in('plan_id', ids) : Promise.resolve({ data: [] as any[] } as any),
  ]);
  const ownerById = new Map<string, PlanOwner>(((owners as PlanOwner[]) || []).map((o) => [o.id, o]));
  const joinRows = (joins as PlanJoin[]) || [];

  // Profiles of people who asked to join my plans.
  const myPlanIds = new Set(plans.filter((p) => p.user_id === myId).map((p) => p.id));
  const requesterIds = Array.from(new Set(joinRows.filter((j) => myPlanIds.has(j.plan_id)).map((j) => j.user_id)));
  const { data: requesters } = requesterIds.length
    ? await supabase.from('profiles').select(OWNER_FIELDS).in('id', requesterIds)
    : { data: [] as any[] };
  const reqById = new Map<string, PlanOwner>(((requesters as PlanOwner[]) || []).map((o) => [o.id, o]));

  const full = plans
    .map((p) => {
      const pj = joinRows.filter((j) => j.plan_id === p.id).map((j) => ({ ...j, user: reqById.get(j.user_id) }));
      return { ...p, owner: ownerById.get(p.user_id), joins: pj, myJoin: pj.find((j) => j.user_id === myId) ?? null };
    })
    .filter((p) => p.owner);

  return {
    feed: full.filter((p) => p.user_id !== myId && new Date(p.starts_at).getTime() > Date.now()),
    mine: full.filter((p) => p.user_id === myId),
  };
}

/** Cleans the plan text the same way chat messages are cleaned (bad words, phone numbers, social handles). */
export function cleanPlanText(raw: string): string {
  const masked = maskBadWords(raw.trim());
  return sanitizeSocialAndContacts(masked.text).text.trim();
}

export async function createPlan(input: {
  userId: string;
  category: PlanCategory;
  title: string;
  place: string;
  startsAt: Date;
  city: string | null;
  country: string | null;
}): Promise<void> {
  const title = cleanPlanText(input.title).slice(0, 140);
  const place = cleanPlanText(input.place).slice(0, 80);
  const { error } = await supabase.from('plans').insert({
    user_id: input.userId,
    category: input.category,
    title,
    place: place || null,
    city: input.city,
    country: input.country,
    starts_at: input.startsAt.toISOString(),
  });
  if (error) {
    if (/row-level security/i.test(error.message)) {
      throw new Error(L('En fazla {0} açık planın olabilir.', 'You can have at most {0} open plans.', [MAX_OPEN_PLANS]));
    }
    throw error;
  }
}

export const MAX_PLAN_EDITS = 5;

/** Turns the database guard errors of plan inserts/updates into readable text. */
function planError(error: { message: string }): Error {
  const m = error.message || '';
  if (/plan_time_range/.test(m)) return new Error(L('Plan saati şimdiden sonra ve en fazla 15 gün içinde olmalı.', 'The plan time must be in the future and within 15 days.'));
  if (/plan_edit_limit/.test(m)) return new Error(L('Bir plan en fazla {0} kez düzenlenebilir.', 'A plan can be edited at most {0} times.', [MAX_PLAN_EDITS]));
  if (/plan_not_open/.test(m)) return new Error(L('İptal edilmiş plan düzenlenemez.', 'A cancelled plan cannot be edited.'));
  return new Error(m);
}

/**
 * Owner edits an open plan. People already accepted get an in-app notification and a push.
 * Returns how many people were notified.
 */
export async function updatePlan(
  plan: Plan,
  input: { category: PlanCategory; title: string; place: string; startsAt: Date },
  myId: string,
  myName: string
): Promise<number> {
  const title = cleanPlanText(input.title).slice(0, 140);
  const place = cleanPlanText(input.place).slice(0, 80);
  const timeOrPlaceChanged =
    new Date(plan.starts_at).getTime() !== input.startsAt.getTime() || (plan.place || '') !== place;
  const { error } = await supabase
    .from('plans')
    .update({ category: input.category, title, place: place || null, starts_at: input.startsAt.toISOString() })
    .eq('id', plan.id)
    .eq('user_id', myId);
  if (error) throw planError(error);

  const accepted = (plan.joins || []).filter((j) => j.status === 'accepted').map((j) => j.user_id);
  if (!timeOrPlaceChanged || accepted.length === 0) return 0;
  await supabase
    .from('notifications')
    .insert(
      accepted.map((uid) => ({
        user_id: uid,
        actor_user_id: myId,
        type: 'plan_update',
        data: { plan_id: plan.id, plan_title: title, actor_name: myName },
      }))
    )
    .then(() => {}, () => {});
  for (const uid of accepted) {
    void supabase.functions
      .invoke('send-push-message', { body: { kind: 'plan_update', plan_id: plan.id, to_user_id: uid, data: { type: 'plan_update', plan_id: plan.id } } })
      .catch(() => {});
  }
  return accepted.length;
}

export async function cancelPlan(planId: string): Promise<void> {
  const { error } = await supabase.from('plans').update({ status: 'cancelled' }).eq('id', planId);
  if (error) throw error;
}

export async function requestJoin(plan: Plan, myId: string, myName: string): Promise<void> {
  const { error } = await supabase.from('plan_joins').insert({ plan_id: plan.id, user_id: myId });
  if (error && error.code !== '23505') throw error;
  await supabase
    .from('notifications')
    .insert({ user_id: plan.user_id, actor_user_id: myId, type: 'plan_join', data: { plan_id: plan.id, plan_title: plan.title, actor_name: myName } })
    .then(() => {}, () => {});
  void supabase.functions
    .invoke('send-push-message', { body: { kind: 'plan_join', plan_id: plan.id, to_user_id: plan.user_id, data: { type: 'plan_join', plan_id: plan.id } } })
    .catch(() => {});
}

export async function withdrawJoin(joinId: string): Promise<void> {
  const { error } = await supabase.from('plan_joins').delete().eq('id', joinId);
  if (error) throw error;
}

/** Owner accepts a request: a match-like chat opens between the two people. Returns the chat session id. */
export async function acceptJoin(plan: Plan, join: PlanJoin, myId: string, myName: string): Promise<string | undefined> {
  const { error } = await supabase.from('plan_joins').update({ status: 'accepted' }).eq('id', join.id);
  if (error) throw error;
  const otherId = join.user_id;
  for (const [a, b] of [
    [myId, otherId],
    [otherId, myId],
  ]) {
    const { error: fe } = await supabase.from('friends').insert({ user_id: a, friend_id: b, status: 'accepted' });
    if (fe && fe.code !== '23505') console.error('friends insert', fe);
  }
  const pair = `and(user1_id.eq.${myId},user2_id.eq.${otherId}),and(user1_id.eq.${otherId},user2_id.eq.${myId})`;
  const { data: existing } = await supabase.from('chat_sessions').select('id').or(pair).eq('status', 'active').maybeSingle();
  let sessionId: string | undefined = existing?.id;
  if (!sessionId) {
    const { data: created } = await supabase
      .from('chat_sessions')
      .insert({ user1_id: myId, user2_id: otherId, status: 'active' })
      .select('id')
      .single();
    sessionId = created?.id;
  }
  await supabase
    .from('notifications')
    .insert({ user_id: otherId, actor_user_id: myId, type: 'plan_accept', data: { plan_id: plan.id, plan_title: plan.title, actor_name: myName, session_id: sessionId } })
    .then(() => {}, () => {});
  void supabase.functions
    .invoke('send-push-message', {
      body: { kind: 'plan_accept', plan_id: plan.id, to_user_id: otherId, data: { type: 'plan_accept', plan_id: plan.id, session_id: sessionId } },
    })
    .catch(() => {});
  return sessionId;
}

export async function declineJoin(joinId: string): Promise<void> {
  const { error } = await supabase.from('plan_joins').update({ status: 'declined' }).eq('id', joinId);
  if (error) throw error;
}

export async function reportPlan(plan: Plan, myId: string, reason: string): Promise<void> {
  const { error } = await supabase.from('plan_reports').insert({ plan_id: plan.id, reporter_id: myId, reason });
  if (error && error.code !== '23505') throw error;
  // Also goes to the moderators' report inbox (with the plan text as context).
  await submitUserReport(myId, plan.user_id, `plan: ${reason}`, { plan_id: plan.id, plan_title: plan.title }).catch(() => {});
}

/** "Bugün 19:00", "Cmt 10:00", "28 Kas 21:00". */
export function formatPlanTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((day.getTime() - today.getTime()) / 86400000);
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (diff === 0) return L('Bugün {0}', 'Today {0}', [hm]);
  if (diff === 1) return L('Yarın {0}', 'Tomorrow {0}', [hm]);
  const days: [string, string][] = [
    ['Paz', 'Sun'], ['Pzt', 'Mon'], ['Sal', 'Tue'], ['Çar', 'Wed'], ['Per', 'Thu'], ['Cum', 'Fri'], ['Cmt', 'Sat'],
  ];
  const dn = days[d.getDay()];
  return `${L(dn[0], dn[1])} ${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')} ${hm}`;
}

export const isWeekend = (iso: string) => {
  const g = new Date(iso).getDay();
  return g === 0 || g === 6;
};
export const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
