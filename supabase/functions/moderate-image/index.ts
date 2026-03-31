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

type Body = { image_base64?: string | null };

/**
 * Image moderation (nudity / +18) via external provider.
 * Recommended: Sightengine (https://sightengine.com/) nudity model.
 *
 * Env vars:
 * - SIGHTENGINE_USER
 * - SIGHTENGINE_SECRET
 *
 * If not configured, returns allowed=true (best-effort to avoid blocking all uploads).
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ allowed: true }, 200);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ allowed: false, message: 'Unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: userRes, error: userErr } = await supabaseClient.auth.getUser(token);
    if (userErr || !userRes?.user) return jsonResponse({ allowed: false, message: 'Invalid token' }, 401);

    const body = (await req.json().catch(() => ({}))) as Body;
    const b64 = typeof body.image_base64 === 'string' ? body.image_base64.trim() : '';
    if (!b64) return jsonResponse({ allowed: true }, 200);

    const seUser = Deno.env.get('SIGHTENGINE_USER');
    const seSecret = Deno.env.get('SIGHTENGINE_SECRET');
    if (!seUser || !seSecret) {
      return jsonResponse({ allowed: true, unconfigured: true }, 200);
    }

    const form = new FormData();
    form.append('models', 'nudity-2.1');
    form.append('api_user', seUser);
    form.append('api_secret', seSecret);
    // Sightengine expects raw base64 without data-url prefix.
    const clean = b64.replace(/^data:image\/\w+;base64,/, '');
    form.append('media', clean);

    const res = await fetch('https://api.sightengine.com/1.0/check.json', {
      method: 'POST',
      body: form,
    });
    const json = await res.json().catch(() => ({} as any));
    if (!res.ok) {
      console.error('Sightengine error:', res.status, json);
      return jsonResponse({ allowed: true, provider_error: true }, 200);
    }

    const nudity = json?.nudity ?? {};
    const sexual = Number(nudity?.sexual_activity ?? 0);
    const explicit = Number(nudity?.explicit ?? 0);
    const verySuggestive = Number(nudity?.very_suggestive ?? 0);

    const score = Math.max(sexual, explicit, verySuggestive);
    const allowed = score < 0.25; // conservative threshold
    return jsonResponse({ allowed, score }, 200);
  } catch (e) {
    console.error('moderate-image error:', e);
    return jsonResponse({ allowed: true, error: 'internal' }, 200);
  }
});

