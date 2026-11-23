/**
 * Moderation (migration 20261123160000_moderation.sql, edge function moderate-user).
 * Reading is done here with RLS (staff only); every write goes through the edge function.
 */
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/uploadAvatar';

export type StaffRole = 'admin' | 'moderator';
export type ModAction = 'warn' | 'suspend' | 'ban' | 'unban' | 'dismiss' | 'role_add' | 'role_remove';

export type MiniProfile = {
  id: string;
  full_name: string;
  profile_picture: string | null;
  birth_date: string | null;
  city: string | null;
  verification_status: string | null;
};

export type Report = {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  created_at: string;
  status: 'open' | 'resolved';
  context: { message_id?: string; excerpt?: string; plan_id?: string; plan_title?: string; message_verified?: boolean } | null;
  reporter?: MiniProfile;
};

export type ReportCase = {
  user: MiniProfile | null;
  userId: string;
  reports: Report[];
  reporters: number;
  blockedBy: number;
  blockReasons: Record<string, number>;
  lastAt: string;
  previous: ModerationAction[];
};

export type ModerationAction = {
  id: string;
  target_user: string | null;
  target_name: string | null;
  target_email: string | null;
  actor_id: string;
  actor_name: string | null;
  action: ModAction;
  reason: string | null;
  note: string | null;
  evidence: string[];
  report_ids: string[];
  until: string | null;
  email_sent: boolean;
  created_at: string;
};

export type BanRow = {
  user_id: string;
  until: string | null;
  reason: string;
  action_id: string | null;
  banned_by: string | null;
  created_at: string;
  user?: MiniProfile;
  log?: ModerationAction;
};

const MINI = 'id, full_name, profile_picture, birth_date, city, verification_status';
export const EVIDENCE_BUCKET = 'moderation-evidence';

let roleCache: { id: string; role: StaffRole | null } | null = null;

/** My staff role, or null. Never throws (null if the table does not exist yet). */
export async function getMyStaffRole(myId: string | null | undefined, fresh = false): Promise<StaffRole | null> {
  if (!myId) return null;
  if (!fresh && roleCache?.id === myId) return roleCache.role;
  try {
    const { data, error } = await supabase.from('staff_roles').select('role').eq('user_id', myId).maybeSingle();
    const role = error ? null : ((data?.role as StaffRole) ?? null);
    roleCache = { id: myId, role };
    return role;
  } catch {
    return null;
  }
}

/** Active ban on my own account (suspension or permanent), or null. */
export async function loadMyBan(myId: string | null | undefined): Promise<{ until: string | null; reason: string } | null> {
  if (!myId) return null;
  try {
    const { data, error } = await supabase.from('user_bans').select('until, reason').eq('user_id', myId).maybeSingle();
    if (error || !data) return null;
    if (data.until && new Date(data.until).getTime() <= Date.now()) return null;
    return data as any;
  } catch {
    return null;
  }
}

async function profilesById(ids: string[]): Promise<Map<string, MiniProfile>> {
  if (!ids.length) return new Map();
  const { data } = await supabase.from('profiles').select(MINI).in('id', ids);
  return new Map(((data as MiniProfile[]) || []).map((p) => [p.id, p]));
}

/** Open reports grouped by reported person, most reported first. */
export async function loadReportCases(): Promise<ReportCase[]> {
  const { data, error } = await supabase
    .from('user_reports')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  const reports = (data as Report[]) || [];
  const targetIds = Array.from(new Set(reports.map((r) => r.reported_user_id)));
  const reporterIds = Array.from(new Set(reports.map((r) => r.reporter_id)));
  const [people, { data: blocks }, { data: history }] = await Promise.all([
    profilesById(Array.from(new Set([...targetIds, ...reporterIds]))),
    targetIds.length ? supabase.from('blocks').select('user_id, blocked_user_id, reason').in('blocked_user_id', targetIds) : Promise.resolve({ data: [] } as any),
    targetIds.length
      ? supabase.from('moderation_actions').select('*').in('target_user', targetIds).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] } as any),
  ]);

  return targetIds
    .map((id) => {
      const rs = reports.filter((r) => r.reported_user_id === id).map((r) => ({ ...r, reporter: people.get(r.reporter_id) }));
      const bs = ((blocks as any[]) || []).filter((b) => b.blocked_user_id === id);
      const blockReasons: Record<string, number> = {};
      for (const b of bs) blockReasons[b.reason || 'other'] = (blockReasons[b.reason || 'other'] || 0) + 1;
      return {
        userId: id,
        user: people.get(id) ?? null,
        reports: rs,
        reporters: new Set(rs.map((r) => r.reporter_id)).size,
        blockedBy: new Set(bs.map((b) => b.user_id)).size,
        blockReasons,
        lastAt: rs[0]?.created_at ?? '',
        previous: ((history as ModerationAction[]) || []).filter((h) => h.target_user === id),
      };
    })
    .sort((a, b) => b.reporters - a.reporters || b.lastAt.localeCompare(a.lastAt));
}

/** Builds a case for any user (e.g. opened from the bans list), including resolved reports. */
export async function loadCaseFor(userId: string): Promise<ReportCase> {
  const [{ data: reps }, { data: blocks }, { data: history }] = await Promise.all([
    supabase.from('user_reports').select('*').eq('reported_user_id', userId).order('created_at', { ascending: false }).limit(100),
    supabase.from('blocks').select('user_id, blocked_user_id, reason').eq('blocked_user_id', userId),
    supabase.from('moderation_actions').select('*').eq('target_user', userId).order('created_at', { ascending: false }),
  ]);
  const reports = (reps as Report[]) || [];
  const people = await profilesById(Array.from(new Set([userId, ...reports.map((r) => r.reporter_id)])));
  const blockReasons: Record<string, number> = {};
  for (const b of (blocks as any[]) || []) blockReasons[b.reason || 'other'] = (blockReasons[b.reason || 'other'] || 0) + 1;
  return {
    userId,
    user: people.get(userId) ?? null,
    reports: reports.map((r) => ({ ...r, reporter: people.get(r.reporter_id) })),
    reporters: new Set(reports.map((r) => r.reporter_id)).size,
    blockedBy: new Set(((blocks as any[]) || []).map((b) => b.user_id)).size,
    blockReasons,
    lastAt: reports[0]?.created_at ?? '',
    previous: (history as ModerationAction[]) || [],
  };
}

export async function loadBans(): Promise<BanRow[]> {
  const { data, error } = await supabase.from('user_bans').select('*').order('created_at', { ascending: false }).limit(300);
  if (error) throw error;
  const rows = (data as BanRow[]) || [];
  const people = await profilesById(rows.map((r) => r.user_id));
  const actionIds = rows.map((r) => r.action_id).filter(Boolean) as string[];
  const { data: logs } = actionIds.length ? await supabase.from('moderation_actions').select('*').in('id', actionIds) : { data: [] as any[] };
  const logById = new Map(((logs as ModerationAction[]) || []).map((l) => [l.id, l]));
  return rows.map((r) => ({ ...r, user: people.get(r.user_id), log: r.action_id ? logById.get(r.action_id) : undefined }));
}

export async function loadModerationLog(limit = 200): Promise<ModerationAction[]> {
  const { data, error } = await supabase.from('moderation_actions').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data as ModerationAction[]) || [];
}

export async function loadStaff(): Promise<{ user_id: string; role: StaffRole; created_at: string; user?: MiniProfile }[]> {
  const { data, error } = await supabase.from('staff_roles').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data as any[]) || [];
  const people = await profilesById(rows.map((r) => r.user_id));
  return rows.map((r) => ({ ...r, user: people.get(r.user_id) }));
}

/** Compresses and uploads one evidence screenshot; returns its storage path. */
export async function uploadEvidence(targetId: string, localUri: string): Promise<string> {
  const buffer = await compressImage(localUri, 1600);
  const path = `${targetId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from(EVIDENCE_BUCKET).upload(path, buffer, { contentType: 'image/jpeg' });
  if (error) throw error;
  return path;
}

/** Short-lived links to view evidence (bucket is private). */
export async function evidenceUrls(paths: string[]): Promise<string[]> {
  if (!paths.length) return [];
  const { data } = await supabase.storage.from(EVIDENCE_BUCKET).createSignedUrls(paths, 3600);
  return ((data as any[]) || []).map((d) => d?.signedUrl).filter(Boolean);
}

async function invoke(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('moderate-user', { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as any).context;
      const j = ctx && typeof ctx.json === 'function' ? await ctx.json() : null;
      if (j?.message) msg = j.message;
    } catch {}
    throw new Error(msg);
  }
  if (data && data.success === false) throw new Error(data.message || 'Error');
  return data;
}

export function actOnUser(input: {
  targetId: string;
  kind: 'warn' | 'suspend' | 'ban' | 'unban' | 'dismiss';
  reason: string;
  note?: string;
  evidence?: string[];
  days?: number;
}): Promise<{ action_id: string; email_sent: boolean; resolved: number }> {
  return invoke({
    action: 'act',
    target_user_id: input.targetId,
    kind: input.kind,
    reason: input.reason,
    note: input.note ?? '',
    evidence: input.evidence ?? [],
    days: input.days,
  });
}

export function setStaffRole(email: string, role: StaffRole | null, userId?: string): Promise<any> {
  return invoke({ action: 'set_role', email, user_id: userId, role });
}

/**
 * Saves a report and alerts moderators. context: the reported message (id + text the reporter saw) or plan.
 * Returns the report id.
 */
export async function submitUserReport(
  reporterId: string,
  reportedUserId: string,
  reason: string,
  context?: Report['context']
): Promise<string | undefined> {
  const row: Record<string, unknown> = { reporter_id: reporterId, reported_user_id: reportedUserId, reason };
  if (context) row.context = context;
  let { data, error } = await supabase.from('user_reports').insert(row).select('id').single();
  if (error && context && /context/i.test(error.message)) {
    // Database without the moderation migration: save the report without context.
    ({ data, error } = await supabase.from('user_reports').insert({ reporter_id: reporterId, reported_user_id: reportedUserId, reason }).select('id').single());
  }
  if (error) throw error;
  const id = (data as any)?.id as string | undefined;
  if (id) void invoke({ action: 'notify_report', report_id: id }).catch(() => {});
  return id;
}
