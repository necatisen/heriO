/**
 * Moderation actions (migration 20261123160000_moderation.sql).
 *
 * action = 'notify_report' (any signed-in user, right after their own report): alerts moderators/admins
 *   with an in-app notification + push.
 * action = 'act' (moderator/admin): warn | suspend | ban | unban | dismiss a user. Suspend/ban need at least one
 *   evidence screenshot (already uploaded to the private `moderation-evidence` bucket). Bans use Supabase Auth's
 *   ban (no sign-in), hide the profile (RLS) and e-mail the person. Every action is written to moderation_actions.
 * action = 'set_role' (admin): add/remove a moderator or admin by e-mail.
 *
 * E-mail uses SMTP secrets (set by the owner, never committed):
 *   SMTP_USER, SMTP_PASS (Gmail app password), optional SMTP_HOST (smtp.gmail.com), SMTP_PORT (465), SMTP_FROM.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import nodemailer from 'npm:nodemailer@6.9.16';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const SUPPORT_EMAIL = 'birthchathelp@gmail.com';
const SUSPEND_DAYS = [1, 7, 30];

const PUSH_REPORT: Record<string, { title: string; body: string }> = {
  tr: { title: 'Yeni şikâyet 🛡️', body: '{name} hakkında: {reason}' },
  en: { title: 'New report 🛡️', body: 'About {name}: {reason}' },
};

const PUSH_WARN: Record<string, { title: string; body: string }> = {
  tr: { title: 'Topluluk kuralları uyarısı', body: 'Hesabınla ilgili bir uyarı var: {reason}. Tekrarı hâlinde hesabın engellenebilir.' },
  en: { title: 'Community rules warning', body: 'Your account received a warning: {reason}. Repeated violations may get your account banned.' },
  de: { title: 'Verwarnung (Community-Regeln)', body: 'Dein Konto wurde verwarnt: {reason}. Bei Wiederholung kann dein Konto gesperrt werden.' },
  fr: { title: 'Avertissement (règles de la communauté)', body: 'Votre compte a reçu un avertissement : {reason}. En cas de récidive, il peut être bloqué.' },
  es: { title: 'Advertencia (normas de la comunidad)', body: 'Tu cuenta recibió una advertencia: {reason}. Si se repite, tu cuenta puede ser bloqueada.' },
  ru: { title: 'Предупреждение (правила сообщества)', body: 'Вашему аккаунту вынесено предупреждение: {reason}. При повторе аккаунт может быть заблокирован.' },
  ar: { title: 'تحذير (قواعد المجتمع)', body: 'تلقى حسابك تحذيرًا: {reason}. تكرار المخالفة قد يؤدي إلى حظر حسابك.' },
};

async function sendPush(admin: any, userIds: string[], title: string, body: string, data: Record<string, unknown>) {
  if (!userIds.length) return;
  const { data: rows } = await admin.from('push_tokens').select('token').in('user_id', userIds);
  const to = Array.from(new Set(((rows as any[]) || []).map((r) => r.token).filter(Boolean)));
  if (!to.length) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(to.map((t) => ({ to: t, title, body, data, sound: 'default', priority: 'high', channelId: 'messages' }))),
    });
  } catch {}
}

function mailText(lang: string, kind: 'warn' | 'suspend' | 'ban', reason: string, until: Date | null) {
  const tr = lang === 'tr';
  const date = until ? until.toLocaleDateString(tr ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  if (tr) {
    const subject =
      kind === 'warn' ? 'Birthchat: Hesabınla ilgili uyarı' : kind === 'suspend' ? 'Birthchat: Hesabın geçici olarak askıya alındı' : 'Birthchat: Hesabın engellendi';
    const what =
      kind === 'warn'
        ? 'Hesabın topluluk kurallarını ihlal ettiği için uyarı aldı. Tekrarı hâlinde hesabın engellenebilir.'
        : kind === 'suspend'
          ? `Hesabın topluluk kurallarını ihlal ettiği için ${date} tarihine kadar askıya alındı. Bu süre içinde giriş yapamazsın.`
          : 'Hesabın topluluk kurallarını ihlal ettiği için kalıcı olarak engellendi. Artık giriş yapamazsın.';
    return {
      subject,
      text: `Merhaba,\n\n${what}\n\nNeden: ${reason}\n\nBu kararın hatalı olduğunu düşünüyorsan ${SUPPORT_EMAIL} adresine bu e-postayı yanıtlayarak itiraz edebilirsin.\n\nBirthchat Ekibi`,
    };
  }
  const subject =
    kind === 'warn' ? 'Birthchat: A warning on your account' : kind === 'suspend' ? 'Birthchat: Your account is suspended' : 'Birthchat: Your account is banned';
  const what =
    kind === 'warn'
      ? 'Your account received a warning for breaking the community rules. Repeated violations may get your account banned.'
      : kind === 'suspend'
        ? `Your account is suspended until ${date} for breaking the community rules. You cannot sign in until then.`
        : 'Your account has been permanently banned for breaking the community rules. You can no longer sign in.';
  return {
    subject,
    text: `Hello,\n\n${what}\n\nReason: ${reason}\n\nIf you think this decision is wrong, you can appeal by replying to ${SUPPORT_EMAIL}.\n\nThe Birthchat team`,
  };
}

async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  const user = Deno.env.get('SMTP_USER');
  const pass = Deno.env.get('SMTP_PASS');
  if (!user || !pass || !to) return false;
  try {
    const transporter = nodemailer.createTransport({
      host: Deno.env.get('SMTP_HOST') || 'smtp.gmail.com',
      port: Number(Deno.env.get('SMTP_PORT') || 465),
      secure: true,
      auth: { user, pass },
    });
    await transporter.sendMail({ from: Deno.env.get('SMTP_FROM') || `Birthchat <${user}>`, replyTo: SUPPORT_EMAIL, to, subject, text });
    return true;
  } catch (e) {
    console.error('mail failed', String(e));
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ success: false, message: 'Unauthorized' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: me, error: meErr } = await userClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (meErr || !me?.user) return json({ success: false, message: 'Invalid token' }, 401);
    const callerId = me.user.id;
    const admin = createClient(url, service);

    const body = (await req.json().catch(() => ({}))) as Record<string, any>;
    const action = String(body.action || '');

    const { data: callerRole } = await admin.from('staff_roles').select('role').eq('user_id', callerId).maybeSingle();
    const role = (callerRole?.role as string | undefined) ?? null;
    const { data: callerProfile } = await admin.from('profiles').select('full_name').eq('id', callerId).maybeSingle();
    const callerName = String(callerProfile?.full_name || me.user.email || '');

    // ---------- Alert staff about a new report ----------
    if (action === 'notify_report') {
      const reportId = String(body.report_id || '');
      const { data: rep } = await admin.from('user_reports').select('*').eq('id', reportId).maybeSingle();
      if (!rep || rep.reporter_id !== callerId || Date.now() - new Date(rep.created_at).getTime() > 10 * 60 * 1000) {
        return json({ success: false, message: 'No such report' }, 403);
      }
      // A reported message must really be from the reported person to the reporter.
      const msgId = rep.context?.message_id;
      if (msgId) {
        const { data: msg } = await admin.from('messages').select('sender_id, receiver_id').eq('id', msgId).maybeSingle();
        const ok = !!msg && msg.sender_id === rep.reported_user_id && msg.receiver_id === callerId;
        if (!ok) await admin.from('user_reports').update({ context: { ...rep.context, message_verified: false } }).eq('id', reportId);
        else await admin.from('user_reports').update({ context: { ...rep.context, message_verified: true } }).eq('id', reportId);
      }
      const { data: staff } = await admin.from('staff_roles').select('user_id');
      const staffIds = ((staff as any[]) || []).map((s) => s.user_id).filter((id: string) => id !== rep.reported_user_id);
      if (!staffIds.length) return json({ success: true, notified: 0 });
      const { data: target } = await admin.from('profiles').select('full_name').eq('id', rep.reported_user_id).maybeSingle();
      const name = String(target?.full_name || '?');
      await admin.from('notifications').insert(
        staffIds.map((id: string) => ({
          user_id: id,
          actor_user_id: callerId,
          type: 'report',
          data: { report_id: reportId, reported_user_id: rep.reported_user_id, reported_name: name, reason: rep.reason },
        }))
      );
      const { data: langs } = await admin.from('profiles').select('id, preferred_language').in('id', staffIds);
      for (const lang of ['tr', 'en']) {
        const ids = ((langs as any[]) || []).filter((p) => (lang === 'tr' ? p.preferred_language === 'tr' : p.preferred_language !== 'tr')).map((p) => p.id);
        const t = PUSH_REPORT[lang];
        await sendPush(admin, ids, t.title, t.body.replace('{name}', name).replace('{reason}', String(rep.reason).slice(0, 80)), {
          type: 'report',
          reported_user_id: rep.reported_user_id,
        });
      }
      return json({ success: true, notified: staffIds.length });
    }

    if (!role) return json({ success: false, message: 'Forbidden' }, 403);

    // ---------- Add / remove staff (admin only) ----------
    if (action === 'set_role') {
      if (role !== 'admin') return json({ success: false, message: 'Admins only' }, 403);
      let targetId = String(body.user_id || '');
      const email = String(body.email || '').trim().toLowerCase();
      if (!targetId && email) {
        for (let page = 1; page <= 20 && !targetId; page++) {
          const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
          const found = list?.users?.find((u: any) => String(u.email || '').toLowerCase() === email);
          if (found) targetId = found.id;
          if (!list?.users?.length || list.users.length < 1000) break;
        }
      }
      if (!targetId) return json({ success: false, message: 'User not found' }, 404);
      if (targetId === callerId) return json({ success: false, message: 'You cannot change your own role' }, 400);
      const newRole = body.role === 'admin' || body.role === 'moderator' ? body.role : null;
      const { data: tp } = await admin.from('profiles').select('full_name').eq('id', targetId).maybeSingle();
      if (newRole) {
        const { error } = await admin.from('staff_roles').upsert({ user_id: targetId, role: newRole, created_by: callerId });
        if (error) return json({ success: false, message: error.message }, 500);
      } else {
        await admin.from('staff_roles').delete().eq('user_id', targetId);
      }
      await admin.from('moderation_actions').insert({
        target_user: targetId,
        target_name: tp?.full_name ?? null,
        actor_id: callerId,
        actor_name: callerName,
        action: newRole ? 'role_add' : 'role_remove',
        reason: newRole ?? 'removed',
      });
      return json({ success: true, user_id: targetId, role: newRole });
    }

    // ---------- Act on a user (moderator/admin) ----------
    if (action === 'act') {
      const kind = String(body.kind || '');
      if (!['warn', 'suspend', 'ban', 'unban', 'dismiss'].includes(kind)) return json({ success: false, message: 'Bad kind' }, 400);
      const targetId = String(body.target_user_id || '');
      if (!targetId || targetId === callerId) return json({ success: false, message: 'Bad target' }, 400);
      const reason = String(body.reason || '').trim().slice(0, 200);
      const note = String(body.note || '').trim().slice(0, 1000);
      if (!reason) return json({ success: false, message: 'Reason required' }, 400);
      const evidence: string[] = Array.isArray(body.evidence) ? body.evidence.map(String).slice(0, 10) : [];
      if (evidence.some((p) => !p.startsWith(`${targetId}/`))) return json({ success: false, message: 'Bad evidence path' }, 400);
      if ((kind === 'suspend' || kind === 'ban') && evidence.length === 0) return json({ success: false, message: 'Evidence required' }, 400);

      const { data: targetRole } = await admin.from('staff_roles').select('role').eq('user_id', targetId).maybeSingle();
      if (targetRole && (role !== 'admin' || targetRole.role === 'admin')) return json({ success: false, message: 'Cannot act on staff' }, 403);

      const { data: authUser } = await admin.auth.admin.getUserById(targetId);
      const targetEmail = String(authUser?.user?.email || '');
      const { data: tp } = await admin.from('profiles').select('full_name, preferred_language').eq('id', targetId).maybeSingle();
      const lang = String(tp?.preferred_language || 'en');

      let until: Date | null = null;
      if (kind === 'suspend') {
        const days = SUSPEND_DAYS.includes(Number(body.days)) ? Number(body.days) : 7;
        until = new Date(Date.now() + days * 86400000);
        const { error } = await admin.auth.admin.updateUserById(targetId, { ban_duration: `${days * 24}h` });
        if (error) return json({ success: false, message: error.message }, 500);
      } else if (kind === 'ban') {
        const { error } = await admin.auth.admin.updateUserById(targetId, { ban_duration: '876000h' });
        if (error) return json({ success: false, message: error.message }, 500);
      } else if (kind === 'unban') {
        const { error } = await admin.auth.admin.updateUserById(targetId, { ban_duration: 'none' });
        if (error) return json({ success: false, message: error.message }, 500);
        await admin.from('user_bans').delete().eq('user_id', targetId);
      }

      const { data: openReports } = await admin.from('user_reports').select('id').eq('reported_user_id', targetId).eq('status', 'open');
      const reportIds = ((openReports as any[]) || []).map((r) => r.id);

      let emailSent = false;
      if (kind === 'warn' || kind === 'suspend' || kind === 'ban') {
        const m = mailText(lang, kind, reason, until);
        emailSent = await sendMail(targetEmail, m.subject, m.text);
      }

      const { data: logRow, error: logErr } = await admin
        .from('moderation_actions')
        .insert({
          target_user: targetId,
          target_name: tp?.full_name ?? null,
          target_email: targetEmail || null,
          actor_id: callerId,
          actor_name: callerName,
          action: kind,
          reason,
          note: note || null,
          evidence,
          report_ids: kind === 'unban' ? [] : reportIds,
          until: until ? until.toISOString() : null,
          email_sent: emailSent,
        })
        .select('id')
        .single();
      if (logErr) return json({ success: false, message: logErr.message }, 500);

      if (kind === 'suspend' || kind === 'ban') {
        await admin.from('user_bans').upsert({
          user_id: targetId,
          until: until ? until.toISOString() : null,
          reason,
          action_id: logRow.id,
          banned_by: callerId,
          created_at: new Date().toISOString(),
        });
      }
      if (kind !== 'unban' && reportIds.length) {
        await admin.from('user_reports').update({ status: 'resolved', resolved_by: callerId, resolved_at: new Date().toISOString() }).in('id', reportIds);
      }
      if (kind === 'warn') {
        await admin.from('notifications').insert({ user_id: targetId, actor_user_id: null, type: 'moderation', data: { action: 'warn', reason } });
        const t = PUSH_WARN[lang] || PUSH_WARN.en;
        await sendPush(admin, [targetId], t.title, t.body.replace('{reason}', reason), { type: 'moderation' });
      }
      return json({ success: true, action_id: logRow.id, email_sent: emailSent, resolved: kind === 'unban' ? 0 : reportIds.length });
    }

    return json({ success: false, message: 'Unknown action' }, 400);
  } catch (e) {
    return json({ success: false, message: String((e as Error)?.message || e) }, 500);
  }
});
