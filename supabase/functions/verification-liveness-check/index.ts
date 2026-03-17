/**
 * Banka tarzı canlılık kontrolü: Kameradaki yüzü AI ile analiz eder.
 * Sağa/sola/orta (baş pozisyonu) headPose.yaw ile tespit edilir.
 * Client periyodik kare gönderir; bu fonksiyon Azure Face API ile yaw döndürür.
 */

import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const YAW_RIGHT_MIN = 18;
const YAW_LEFT_MAX = -18;
const YAW_CENTER_MIN = -12;
const YAW_CENTER_MAX = 12;

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function base64ToBinary(base64: string): Uint8Array {
  const data = base64.replace(/^data:image\/\w+;base64,/, '');
  return Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
}

async function azureFaceDetectHeadPose(
  endpoint: string,
  key: string,
  imageBuffer: Uint8Array
): Promise<{ yaw?: number; faceCount: number }> {
  const url = `${endpoint.replace(/\/$/, '')}/face/v1.0/detect?returnFaceId=false&returnFaceLandmarks=false&returnFaceAttributes=headPose&detectionModel=detection_03`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/octet-stream',
    },
    body: imageBuffer,
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('Azure Face Detect error:', res.status, text);
    return { faceCount: 0 };
  }
  const faces = await res.json();
  if (!Array.isArray(faces) || faces.length === 0) {
    return { faceCount: 0 };
  }
  const yaw = faces[0].faceAttributes?.headPose?.yaw;
  return {
    yaw: typeof yaw === 'number' ? yaw : undefined,
    faceCount: faces.length,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ success: false, message: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ success: false, message: 'Unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const azureEndpoint = Deno.env.get('AZURE_FACE_ENDPOINT');
    const azureKey = Deno.env.get('AZURE_FACE_KEY');

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      return jsonResponse({ success: false, message: 'Invalid or expired token' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const imageBase64 = body.image_base64 as string | undefined;
    const step = body.step as string | undefined;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return jsonResponse({ complete: false, error: 'Missing image_base64' }, 400);
    }
    if (!['right', 'left', 'blink'].includes(step)) {
      return jsonResponse({ complete: false, error: 'Invalid step' }, 400);
    }

    if (!azureEndpoint || !azureKey) {
      return jsonResponse({ complete: false, error: 'Face API not configured' }, 503);
    }

    const binary = base64ToBinary(imageBase64);
    const { yaw, faceCount } = await azureFaceDetectHeadPose(azureEndpoint, azureKey, binary);

    if (faceCount === 0) {
      return jsonResponse({ complete: false, noFace: true });
    }
    if (faceCount > 1) {
      return jsonResponse({ complete: false, multipleFaces: true });
    }

    if (yaw === undefined) {
      return jsonResponse({ complete: false });
    }

    let complete = false;
    let next: string | undefined;

    if (step === 'right') {
      if (yaw >= YAW_RIGHT_MIN) {
        complete = true;
        next = 'left';
      }
    } else if (step === 'left') {
      if (yaw <= YAW_LEFT_MAX) {
        complete = true;
        next = 'blink';
      }
    } else if (step === 'blink') {
      if (yaw >= YAW_CENTER_MIN && yaw <= YAW_CENTER_MAX) {
        complete = true;
        next = 'submit';
      }
    }

    return jsonResponse({ complete, next, yaw });
  } catch (e) {
    console.error('liveness-check error:', e);
    return jsonResponse(
      { complete: false, error: e instanceof Error ? e.message : 'Internal error' },
      500
    );
  }
});
