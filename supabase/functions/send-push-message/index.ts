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
const PUSH_TEXT: Record<string, { newMessage: string; photo: string }> = {
  tr: { newMessage: 'Yeni mesaj', photo: '📷 Fotoğraf' },
  en: { newMessage: 'New message', photo: '📷 Photo' },
  de: { newMessage: 'Neue Nachricht', photo: '📷 Foto' },
  fr: { newMessage: 'Nouveau message', photo: '📷 Photo' },
  es: { newMessage: 'Nuevo mensaje', photo: '📷 Foto' },
  ru: { newMessage: 'Новое сообщение', photo: '📷 Фото' },
  ar: { newMessage: 'رسالة جديدة', photo: '📷 صورة' },
};

type RequestBody = {
  /** 'photo' → body is replaced by a localized "Photo" label */
  media?: 'text' | 'photo';
  to_user_id?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
};

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
    const localizedTitle = String(sender?.full_name || '').trim() || txt.newMessage;
    const localizedBody = payload.media === 'photo' ? txt.photo : bodyText;
    const { data: tokens, error: tokensErr } = await admin
      .from('push_tokens')
      .select('token')
      .eq('user_id', toUserId);

    if (tokensErr) return jsonResponse({ success: false, message: tokensErr.message }, 500);
    const to = Array.from(new Set((tokens || []).map((t: any) => t.token).filter(Boolean)));
    if (to.length === 0) return jsonResponse({ success: true, delivered: 0 });

    const expoMessages = to.map((expoToken) => ({
      to: expoToken,
      title: localizedTitle,
      body: localizedBody,
      data,
      sound: 'default',
    }));

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(expoMessages),
    });

    const json = await res.json().catch(() => ({}));
    return jsonResponse({ success: res.ok, delivered: to.length, expo: json }, res.ok ? 200 : 502);
  } catch (e) {
    console.error('send-push-message error:', e);
    return jsonResponse({ success: false, message: e instanceof Error ? e.message : 'Internal error' }, 500);
  }
});

