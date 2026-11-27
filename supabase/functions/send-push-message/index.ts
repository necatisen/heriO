import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Text the receiver sees, in the receiver's own app language.
// {name} = sender's name.
type PushText = { newMessage: string; photo: string; likeTitle: string; like: string; matchTitle: string; match: string };
const PUSH_TEXT: Record<string, PushText> = {
  tr: { newMessage: 'Yeni mesaj', photo: '📷 Fotoğraf', likeTitle: 'Yeni beğeni ❤️', like: '{name} seni beğendi. Görmek için dokun.', matchTitle: 'Yeni eşleşme 🎉', match: '{name} ile eşleştiniz! Hemen mesaj gönder.' },
  en: { newMessage: 'New message', photo: '📷 Photo', likeTitle: 'New like ❤️', like: '{name} liked you. Tap to see.', matchTitle: "It's a match 🎉", match: 'You and {name} matched! Say hi now.' },
  de: { newMessage: 'Neue Nachricht', photo: '📷 Foto', likeTitle: 'Neues Like ❤️', like: '{name} mag dich. Tippe zum Ansehen.', matchTitle: "It's a Match 🎉", match: 'Du und {name} habt ein Match! Schreib jetzt.' },
  fr: { newMessage: 'Nouveau message', photo: '📷 Photo', likeTitle: 'Nouveau like ❤️', like: '{name} vous a liké. Touchez pour voir.', matchTitle: "C'est un match 🎉", match: 'Vous et {name} avez matché ! Écrivez maintenant.' },
  es: { newMessage: 'Nuevo mensaje', photo: '📷 Foto', likeTitle: 'Nuevo me gusta ❤️', like: 'A {name} le gustas. Toca para ver.', matchTitle: '¡Es un match! 🎉', match: '¡Tú y {name} hicisteis match! Escríbele ahora.' },
  ru: { newMessage: 'Новое сообщение', photo: '📷 Фото', likeTitle: 'Новая симпатия ❤️', like: 'Вы понравились: {name}. Нажмите, чтобы посмотреть.', matchTitle: 'Взаимная симпатия 🎉', match: 'У вас взаимная симпатия с {name}! Напишите сейчас.' },
  ar: { newMessage: 'رسالة جديدة', photo: '📷 صورة', likeTitle: 'إعجاب جديد ❤️', like: 'أُعجب بك {name}. اضغط للمشاهدة.', matchTitle: 'تطابق جديد 🎉', match: 'حدث تطابق بينك وبين {name}! أرسل رسالة الآن.' },
};

// Plan notifications ({name} = sender, {plan} = plan title).
const PLAN_TEXT: Record<string, { joinTitle: string; join: string; acceptTitle: string; accept: string; updateTitle: string; update: string }> = {
  tr: { joinTitle: 'Planına katılmak istiyor 🙋', join: '{name}: "{plan}"', acceptTitle: 'Plan isteğin kabul edildi 🎉', accept: '{name} seni "{plan}" planına kabul etti. Sohbet açıldı!', updateTitle: "Plan güncellendi 📝", update: "{name} \"{plan}\" planını güncelledi. Yeni saat ve yere göz at." },
  en: { joinTitle: 'Someone wants to join 🙋', join: '{name}: "{plan}"', acceptTitle: 'Your request was accepted 🎉', accept: '{name} accepted you for "{plan}". Your chat is open!', updateTitle: "Plan updated 📝", update: "{name} updated \"{plan}\". Check the new time and place." },
  de: { joinTitle: 'Jemand möchte mitmachen 🙋', join: '{name}: "{plan}"', acceptTitle: 'Deine Anfrage wurde angenommen 🎉', accept: '{name} hat dich für "{plan}" angenommen. Der Chat ist offen!', updateTitle: "Plan aktualisiert 📝", update: "{name} hat „{plan}“ geändert. Sieh dir Zeit und Ort an." },
  fr: { joinTitle: "Quelqu'un veut participer 🙋", join: '{name} : « {plan} »', acceptTitle: 'Demande acceptée 🎉', accept: '{name} vous a accepté pour « {plan} ». La discussion est ouverte !', updateTitle: "Plan modifié 📝", update: "{name} a modifié « {plan} ». Vérifiez la nouvelle heure et le lieu." },
  es: { joinTitle: 'Alguien quiere unirse 🙋', join: '{name}: "{plan}"', acceptTitle: 'Solicitud aceptada 🎉', accept: '{name} te aceptó en "{plan}". ¡El chat está abierto!', updateTitle: "Plan actualizado 📝", update: "{name} actualizó \"{plan}\". Revisa la nueva hora y lugar." },
  ru: { joinTitle: 'Хотят присоединиться 🙋', join: '{name}: «{plan}»', acceptTitle: 'Заявка принята 🎉', accept: '{name} принял(а) вас в план «{plan}». Чат открыт!', updateTitle: "План обновлён 📝", update: "{name} изменил(а) план «{plan}». Проверьте новое время и место." },
  ar: { joinTitle: 'شخص يريد الانضمام 🙋', join: '{name}: «{plan}»', acceptTitle: 'تم قبول طلبك 🎉', accept: 'قبلك {name} في خطة «{plan}». المحادثة مفتوحة!', updateTitle: "تم تحديث الخطة 📝", update: "قام {name} بتحديث «{plan}». تحقق من الوقت والمكان الجديدين." },
};

// Birthday greetings ({name} = sender).
const BDAY_TEXT: Record<string, { wishTitle: string; wish: string; helloTitle: string; hello: string; thanksTitle: string; thanks: string }> = {
  tr: { wishTitle: 'Doğum günün kutlandı 🎂', wish: '{name} doğum gününü kutladı. Görmek için dokun.', helloTitle: 'Doğum günü ikizinden selam 👋', hello: '{name} ile aynı gün doğmuşsunuz! Selamını görmek için dokun.', thanksTitle: 'Teşekkür geldi 💌', thanks: '{name} kutlaman için teşekkür etti. Sohbet açıldı!' },
  en: { wishTitle: 'Someone celebrated your birthday 🎂', wish: '{name} wished you a happy birthday. Tap to see.', helloTitle: 'Hello from a birthday twin 👋', hello: 'You and {name} share a birthday! Tap to see their note.', thanksTitle: 'You got a thank-you 💌', thanks: '{name} thanked you for your note. Your chat is open!' },
  de: { wishTitle: 'Glückwunsch zum Geburtstag 🎂', wish: '{name} hat dir zum Geburtstag gratuliert. Tippe, um es zu sehen.', helloTitle: 'Gruß von deinem Geburtstagszwilling 👋', hello: 'Du und {name} habt am selben Tag Geburtstag! Tippe für die Nachricht.', thanksTitle: 'Ein Dankeschön 💌', thanks: '{name} hat sich für deine Nachricht bedankt. Der Chat ist offen!' },
  fr: { wishTitle: 'On a fêté ton anniversaire 🎂', wish: '{name} vous a souhaité un joyeux anniversaire. Touchez pour voir.', helloTitle: "Bonjour d'un jumeau d'anniversaire 👋", hello: 'Vous et {name} êtes nés le même jour ! Touchez pour voir le message.', thanksTitle: 'Un merci pour vous 💌', thanks: '{name} vous remercie pour votre message. La discussion est ouverte !' },
  es: { wishTitle: 'Te felicitaron el cumpleaños 🎂', wish: '{name} te felicitó el cumpleaños. Toca para verlo.', helloTitle: 'Saludo de tu gemelo de cumpleaños 👋', hello: '¡Tú y {name} cumplís el mismo día! Toca para ver su nota.', thanksTitle: 'Te dieron las gracias 💌', thanks: '{name} te agradeció tu nota. ¡El chat está abierto!' },
  ru: { wishTitle: 'Вас поздравили с днём рождения 🎂', wish: '{name} поздравил(а) вас с днём рождения. Нажмите, чтобы посмотреть.', helloTitle: 'Привет от близнеца по дню рождения 👋', hello: 'Вы с {name} родились в один день! Нажмите, чтобы прочитать.', thanksTitle: 'Вас поблагодарили 💌', thanks: '{name} поблагодарил(а) за поздравление. Чат открыт!' },
  ar: { wishTitle: 'تمت تهنئتك بعيد ميلادك 🎂', wish: 'هنّأك {name} بعيد ميلادك. اضغط للمشاهدة.', helloTitle: 'تحية من توأم عيد ميلادك 👋', hello: 'أنت و{name} وُلدتما في اليوم نفسه! اضغط لقراءة الرسالة.', thanksTitle: 'وصلك شكر 💌', thanks: 'شكرك {name} على رسالتك. المحادثة مفتوحة!' },
};

type RequestBody = {
  /** 'like' / 'match' / 'plan_join' / 'plan_accept' / 'birthday_*' → title and body are built here in the receiver's language */
  kind?: 'message' | 'like' | 'match' | 'plan_join' | 'plan_accept' | 'plan_update' | 'birthday_wish' | 'birthday_thanks';
  plan_id?: string;
  /** 'photo' → body is replaced by a localized "Photo" label */
  media?: 'text' | 'photo';
  to_user_id?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
};

type TokenRow = { token: string; platform: string; last_ticket_id?: string | null };

/** App removed from the phone: forget the token and record it for statistics. Nothing is sent to the user. */
async function markUninstalled(admin: any, userId: string, rows: TokenRow[]) {
  for (const r of rows) {
    try {
      await admin.from('push_tokens').delete().eq('user_id', userId).eq('token', r.token);
      // updated_at is left unchanged so it still shows when the app was last opened.
      await admin
        .from('push_diagnostics')
        .update({ stage: 'uninstalled', detail: `DeviceNotRegistered ${new Date().toISOString()}` })
        .eq('user_id', userId)
        .eq('platform', r.platform || 'android');
    } catch {}
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ success: false, message: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ success: false, message: 'Unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: userRes, error: userErr } = await supabaseClient.auth.getUser(token);
    if (userErr || !userRes?.user) return jsonResponse({ success: false, message: 'Invalid token' }, 401);

    const payload = (await req.json().catch(() => ({}))) as RequestBody;
    const toUserId = String(payload.to_user_id || '').trim();
    const title = String(payload.title || '').trim() || 'New message';
    const bodyText = String(payload.body || '').trim() || 'You have a new message';
    const data = (payload.data && typeof payload.data === 'object' ? payload.data : {}) as Record<string, unknown>;

    if (!toUserId) return jsonResponse({ success: false, message: 'to_user_id is required' }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    // Localize for the receiver; title = sender's name (like most chat apps).
    const { data: people } = await admin
      .from('profiles')
      .select('id, full_name, preferred_language')
      .in('id', [toUserId, userRes.user.id]);
    const receiver = (people || []).find((p: any) => p.id === toUserId);
    const sender = (people || []).find((p: any) => p.id === userRes.user.id);
    const txt = PUSH_TEXT[String(receiver?.preferred_language || 'en')] || PUSH_TEXT.en;
    const senderName = String(sender?.full_name || '').trim();
    let localizedTitle = senderName || txt.newMessage;
    let localizedBody = payload.media === 'photo' ? txt.photo : bodyText;
    if (payload.kind === 'like' || payload.kind === 'match') {
      // Only a real like from the caller may trigger these (no spam pushes to arbitrary users).
      const { data: like } = await admin
        .from('likes')
        .select('id')
        .eq('user_id', userRes.user.id)
        .eq('liked_user_id', toUserId)
        .maybeSingle();
      if (!like) return jsonResponse({ success: false, message: 'No like found' }, 403);
      const name = senderName || 'Birthchat';
      localizedTitle = payload.kind === 'like' ? txt.likeTitle : txt.matchTitle;
      localizedBody = (payload.kind === 'like' ? txt.like : txt.match).replace('{name}', name);
    }
    if (payload.kind === 'plan_join' || payload.kind === 'plan_accept') {
      // Only a real join request (caller → receiver's plan) or a real acceptance (caller's plan → receiver).
      const planId = String(payload.plan_id || '');
      const { data: plan } = await admin.from('plans').select('id, user_id, title').eq('id', planId).maybeSingle();
      const joinerId = payload.kind === 'plan_join' ? userRes.user.id : toUserId;
      const ownerId = payload.kind === 'plan_join' ? toUserId : userRes.user.id;
      const { data: join } = plan
        ? await admin.from('plan_joins').select('status').eq('plan_id', planId).eq('user_id', joinerId).maybeSingle()
        : { data: null };
      const valid =
        !!plan && plan.user_id === ownerId && !!join && (payload.kind === 'plan_join' || join.status === 'accepted');
      if (!valid) return jsonResponse({ success: false, message: 'No such plan request' }, 403);
      const pt = PLAN_TEXT[String(receiver?.preferred_language || 'en')] || PLAN_TEXT.en;
      const name = senderName || 'Birthchat';
      const planTitle = String(plan.title || '').slice(0, 60);
      localizedTitle = payload.kind === 'plan_join' ? pt.joinTitle : pt.acceptTitle;
      localizedBody = (payload.kind === 'plan_join' ? pt.join : pt.accept).replace('{name}', name).replace('{plan}', planTitle);
    }
    if (payload.kind === 'plan_update') {
      // Only the plan owner, right after an edit, to people already accepted to the plan.
      const planId = String(payload.plan_id || '');
      const { data: plan } = await admin.from('plans').select('id, user_id, title, edited_at').eq('id', planId).maybeSingle();
      const { data: join } = plan
        ? await admin.from('plan_joins').select('status').eq('plan_id', planId).eq('user_id', toUserId).maybeSingle()
        : { data: null };
      const fresh = !!plan?.edited_at && Date.now() - new Date(plan.edited_at).getTime() < 10 * 60 * 1000;
      if (!plan || plan.user_id !== userRes.user.id || join?.status !== 'accepted' || !fresh) {
        return jsonResponse({ success: false, message: 'No such plan update' }, 403);
      }
      const pt = PLAN_TEXT[String(receiver?.preferred_language || 'en')] || PLAN_TEXT.en;
      localizedTitle = pt.updateTitle;
      localizedBody = pt.update.replace('{name}', senderName || 'Birthchat').replace('{plan}', String(plan.title || '').slice(0, 60));
    }
    if (payload.kind === 'birthday_wish' || payload.kind === 'birthday_thanks') {
      // wish: caller sent a greeting to the receiver. thanks: the receiver's greeting to the caller was thanked.
      const [from, to] = payload.kind === 'birthday_wish' ? [userRes.user.id, toUserId] : [toUserId, userRes.user.id];
      const { data: g } = await admin
        .from('birthday_greetings')
        .select('kind, thanked_at, created_at')
        .eq('from_user', from)
        .eq('to_user', to)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      // Only right after the action, so one greeting cannot be replayed into many pushes.
      const recent = (iso?: string | null) => !!iso && Date.now() - new Date(iso).getTime() < 10 * 60 * 1000;
      const valid = payload.kind === 'birthday_wish' ? !!g && recent(g.created_at) && !g.thanked_at : recent(g?.thanked_at);
      if (!valid) return jsonResponse({ success: false, message: 'No such greeting' }, 403);
      const bt = BDAY_TEXT[String(receiver?.preferred_language || 'en')] || BDAY_TEXT.en;
      const name = senderName || 'Birthchat';
      if (payload.kind === 'birthday_thanks') {
        localizedTitle = bt.thanksTitle;
        localizedBody = bt.thanks.replace('{name}', name);
      } else if (g.kind === 'wish') {
        localizedTitle = bt.wishTitle;
        localizedBody = bt.wish.replace('{name}', name);
      } else {
        localizedTitle = bt.helloTitle;
        localizedBody = bt.hello.replace('{name}', name);
      }
    }
    // last_ticket_id comes from migration 20261121120000; fall back if it has not been applied yet.
    let { data: tokens, error: tokensErr } = await admin
      .from('push_tokens')
      .select('token, platform, last_ticket_id')
      .eq('user_id', toUserId);
    if (tokensErr) {
      ({ data: tokens, error: tokensErr } = await admin.from('push_tokens').select('token, platform').eq('user_id', toUserId));
    }

    if (tokensErr) return jsonResponse({ success: false, message: tokensErr.message }, 500);
    const rows = (tokens || []) as TokenRow[];

    // Silent uninstall detection: the receipt of the previous push says DeviceNotRegistered → app was removed.
    const gone = new Set<string>();
    const ticketIds = rows.map((r) => r.last_ticket_id).filter(Boolean) as string[];
    if (ticketIds.length > 0) {
      try {
        const rr = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ ids: ticketIds }),
        });
        const receipts = ((await rr.json().catch(() => ({}))) as any)?.data || {};
        for (const r of rows) {
          const rec = r.last_ticket_id ? receipts[r.last_ticket_id] : null;
          if (rec?.status === 'error' && rec?.details?.error === 'DeviceNotRegistered') gone.add(r.token);
        }
      } catch {}
    }

    const live = rows.filter((r) => r.token && !gone.has(r.token));
    const to = Array.from(new Set(live.map((r) => r.token)));
    if (to.length === 0) {
      await markUninstalled(admin, toUserId, rows.filter((r) => gone.has(r.token)));
      return jsonResponse({ success: true, delivered: 0 });
    }

    const expoMessages = to.map((expoToken) => ({
      to: expoToken,
      title: localizedTitle,
      body: localizedBody,
      data,
      sound: 'default',
      priority: 'high', // deliver right away even when the phone is idle
      channelId: 'messages', // Android channel created by the app (lib/pushNotifications.ts)
    }));

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(expoMessages),
    });

    const json = (await res.json().catch(() => ({}))) as any;

    // Tickets come back in the same order as the messages: remember ok ticket ids, drop tokens Expo already rejects.
    const tickets: any[] = Array.isArray(json?.data) ? json.data : [];
    const now = new Date().toISOString();
    await Promise.all(
      tickets.map(async (t, i) => {
        const token = to[i];
        if (!token) return;
        if (t?.status === 'error' && t?.details?.error === 'DeviceNotRegistered') {
          gone.add(token);
        } else if (t?.status === 'ok' && t?.id) {
          await admin
            .from('push_tokens')
            .update({ last_ticket_id: t.id, last_ticket_at: now })
            .eq('user_id', toUserId)
            .eq('token', token)
            .then(() => {}, () => {});
        }
      })
    );
    await markUninstalled(admin, toUserId, rows.filter((r) => gone.has(r.token)));

    return jsonResponse({ success: res.ok, delivered: to.length, expo: json }, res.ok ? 200 : 502);
  } catch (e) {
    console.error('send-push-message error:', e);
    return jsonResponse({ success: false, message: e instanceof Error ? e.message : 'Internal error' }, 500);
  }
});

