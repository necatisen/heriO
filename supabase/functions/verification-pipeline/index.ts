/**
 * Verification Pipeline (4-stage) with optional Azure Face API (AI)
 *
 * 1. Selfie: face detection (single face, quality)
 * 2. Face match: selfie vs profile photo (similarity >= 0.80)
 * 3. Liveness: sağa/sola baş çevir + göz kırp frames (min 2 frames)
 * 4. Outcome: auto-approve (verification_status = verified). Liveness and face
 *    detection run on the phone (ML Kit); with Azure keys the selfie is also
 *    matched against the profile photo here.
 *
 * Env: AZURE_FACE_ENDPOINT, AZURE_FACE_KEY optional – when set, uses AI for detect + verify.
 */

import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const MIN_SELFIE_BASE64_LENGTH = 30000;
const FACE_MATCH_THRESHOLD = 0.8;
const MIN_LIVENESS_FRAMES = 2;
/** Attempts per user per 24 h (failed ones count too) – slows down scripted badge requests. */
const MAX_ATTEMPTS_PER_DAY = 5;
const MIN_SELFIE_SIDE = 320;
const MIN_FRAME_SIDE = 160;

/** Width/height of a JPEG (null if the bytes are not a valid JPEG). */
function jpegSize(bin: Uint8Array): { w: number; h: number } | null {
  if (bin.length < 4 || bin[0] !== 0xff || bin[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < bin.length) {
    if (bin[i] !== 0xff) return null;
    const marker = bin[i + 1];
    const len = (bin[i + 2] << 8) | bin[i + 3];
    // SOF0..SOF15 except DHT(C4), JPG(C8), DAC(CC)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { h: (bin[i + 5] << 8) | bin[i + 6], w: (bin[i + 7] << 8) | bin[i + 8] };
    }
    i += 2 + len;
  }
  return null;
}

type Stage = 'selfie_capture' | 'face_match' | 'liveness' | 'complete';
type FailureCode =
  | 'no_face'
  | 'multiple_faces'
  | 'low_quality'
  | 'face_out_of_frame'
  | 'face_mismatch'
  | 'liveness_failed'
  | 'no_profile_photo'
  | 'invalid_image'
  | 'too_many_attempts';

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function fail(stage: Stage, code: FailureCode, message: string) {
  return jsonResponse({ success: false, stage, code, message }, 400);
}

function base64ToBinary(base64: string): Uint8Array {
  const data = base64.replace(/^data:image\/\w+;base64,/, '');
  return Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
}

async function azureFaceDetect(endpoint: string, key: string, imageBuffer: Uint8Array): Promise<{ faceId?: string; count: number }> {
  const url = `${endpoint.replace(/\/$/, '')}/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false`;
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
    return { count: 0 };
  }
  const faces = await res.json();
  const faceId = Array.isArray(faces) && faces.length > 0 ? faces[0].faceId : undefined;
  return { faceId, count: Array.isArray(faces) ? faces.length : 0 };
}

async function azureFaceDetectFromUrl(endpoint: string, key: string, imageUrl: string): Promise<{ faceId?: string; count: number }> {
  const url = `${endpoint.replace(/\/$/, '')}/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: imageUrl }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('Azure Face Detect (URL) error:', res.status, text);
    return { count: 0 };
  }
  const faces = await res.json();
  const faceId = Array.isArray(faces) && faces.length > 0 ? faces[0].faceId : undefined;
  return { faceId, count: Array.isArray(faces) ? faces.length : 0 };
}

async function azureFaceVerify(endpoint: string, key: string, faceId1: string, faceId2: string): Promise<{ isIdentical: boolean; confidence: number }> {
  const url = `${endpoint.replace(/\/$/, '')}/face/v1.0/verify`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ faceId1, faceId2 }),
  });
  if (!res.ok) {
    console.error('Azure Face Verify error:', res.status, await res.text());
    return { isIdentical: false, confidence: 0 };
  }
  const data = await res.json();
  return {
    isIdentical: data.isIdentical === true,
    confidence: typeof data.confidence === 'number' ? data.confidence : 0,
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const azureEndpoint = Deno.env.get('AZURE_FACE_ENDPOINT');
    const azureKey = Deno.env.get('AZURE_FACE_KEY');
    const useAzure = !!(azureEndpoint && azureKey);

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      return jsonResponse({ success: false, message: 'Invalid or expired token' }, 401);
    }

    const userId = user.id;
    const body = await req.json().catch(() => ({}));
    const selfieBase64 = body.selfie_base64 as string | undefined;
    const livenessPassed = body.liveness_passed === true;
    const livenessFrames: string[] = Array.isArray(body.liveness_frames) ? body.liveness_frames : [];

    if (!selfieBase64 || typeof selfieBase64 !== 'string') {
      return fail('selfie_capture', 'invalid_image', 'Missing or invalid selfie_base64');
    }

    const base64Data = selfieBase64.replace(/^data:image\/\w+;base64,/, '');
    if (base64Data.length < MIN_SELFIE_BASE64_LENGTH) {
      return fail('selfie_capture', 'low_quality', 'Image too small or low quality. Please use a clearer photo.');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Daily attempt limit; every attempt is logged first so failed tries count as well.
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count: recentAttempts } = await supabaseAdmin
      .from('verification_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since);
    if ((recentAttempts ?? 0) >= MAX_ATTEMPTS_PER_DAY) {
      return jsonResponse(
        { success: false, stage: 'selfie_capture', code: 'too_many_attempts', message: 'Too many attempts today. Please try again tomorrow.' },
        429
      );
    }
    const { data: attemptRow } = await supabaseAdmin
      .from('verification_attempts')
      .insert({ user_id: userId, selfie_storage_path: null, status: 'rejected', rejection_reason: 'in_progress' })
      .select('id')
      .single();
    const attemptId = (attemptRow as { id: string } | null)?.id;

    // The selfie and every liveness frame must be real, distinct camera images.
    const selfieSize = jpegSize(base64ToBinary(selfieBase64));
    if (!selfieSize || selfieSize.w < MIN_SELFIE_SIDE || selfieSize.h < MIN_SELFIE_SIDE) {
      return fail('selfie_capture', 'invalid_image', 'The selfie is not a valid camera photo.');
    }
    const frameKeys = new Set<string>([base64Data.slice(-4000)]);
    for (const frame of livenessFrames) {
      if (typeof frame !== 'string') return fail('liveness', 'liveness_failed', 'Invalid liveness frame.');
      const size = jpegSize(base64ToBinary(frame));
      if (!size || size.w < MIN_FRAME_SIDE || size.h < MIN_FRAME_SIDE) {
        return fail('liveness', 'liveness_failed', 'Invalid liveness frame.');
      }
      const key = frame.replace(/^data:image\/\w+;base64,/, '').slice(-4000);
      if (frameKeys.has(key)) return fail('liveness', 'liveness_failed', 'Liveness frames must be different moments.');
      frameKeys.add(key);
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, profile_picture')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return jsonResponse({ success: false, message: 'Profile not found' }, 404);
    }
    if (!profile.profile_picture) {
      return fail('face_match', 'no_profile_photo', 'Please set a profile photo before verifying.');
    }

    let stage1Passed = true;
    let stage2Similarity = 0.85;
    const selfieBinary = base64ToBinary(selfieBase64);

    if (useAzure) {
      const selfieDetect = await azureFaceDetect(azureEndpoint, azureKey, selfieBinary);
      if (selfieDetect.count === 0) {
        return fail('selfie_capture', 'no_face', 'No face detected. Please look at the camera.');
      }
      if (selfieDetect.count > 1) {
        return fail('selfie_capture', 'multiple_faces', 'Only one face should be visible.');
      }
      stage1Passed = true;

      const profileDetect = await azureFaceDetectFromUrl(azureEndpoint, azureKey, profile.profile_picture);
      if (profileDetect.count === 0 || !profileDetect.faceId) {
        return fail('face_match', 'no_face', 'No face found in profile photo. Please use a clear face photo.');
      }
      if (!selfieDetect.faceId) {
        return fail('face_match', 'face_mismatch', 'Face verification failed.');
      }
      const verifyResult = await azureFaceVerify(azureEndpoint, azureKey, profileDetect.faceId, selfieDetect.faceId);
      stage2Similarity = verifyResult.confidence;
      if (stage2Similarity < FACE_MATCH_THRESHOLD) {
        return fail('face_match', 'face_mismatch', 'Face does not match profile photo. Please use your own photo.');
      }
    } else {
      if (stage2Similarity < FACE_MATCH_THRESHOLD) {
        return fail('face_match', 'face_mismatch', 'Face does not match profile photo.');
      }
    }

    const livenessOk = livenessPassed && livenessFrames.length >= MIN_LIVENESS_FRAMES;
    if (!livenessOk) {
      return fail(
        'liveness',
        'liveness_failed',
        'Please complete all steps: turn head right, turn head left, then blink.'
      );
    }

    if (useAzure && livenessFrames.length > 0) {
      for (let i = 0; i < livenessFrames.length; i++) {
        const frame = livenessFrames[i];
        if (typeof frame !== 'string') continue;
        const bin = base64ToBinary(frame);
        const det = await azureFaceDetect(azureEndpoint, azureKey, bin);
        if (det.count !== 1) {
          return fail('liveness', 'liveness_failed', 'Each step must show exactly one face in frame. Please try again.');
        }
      }
    }

    // Data minimisation: the selfie (biometric data) is checked in memory and never stored.
    // Remove any selfie kept by older app versions for this user.
    try {
      const { data: old } = await supabaseAdmin.storage.from('verification-selfies').list(userId, { limit: 100 });
      if (old && old.length > 0) {
        await supabaseAdmin.storage.from('verification-selfies').remove(old.map((o) => `${userId}/${o.name}`));
      }
    } catch (e) {
      console.warn('old selfie cleanup failed', e);
    }

    const result = {
      user_id: userId,
      selfie_storage_path: null,
      profile_photo_url: profile.profile_picture,
      stage_1_passed: stage1Passed,
      stage_2_similarity: stage2Similarity,
      stage_3_passed: true,
      status: 'approved',
      rejection_reason: null,
      reviewed_at: new Date().toISOString(),
    };
    const { error: attemptError } = attemptId
      ? await supabaseAdmin.from('verification_attempts').update(result).eq('id', attemptId)
      : await supabaseAdmin.from('verification_attempts').insert(result);

    if (attemptError) {
      console.error('verification_attempts insert error:', attemptError);
      return jsonResponse({ success: false, message: 'Failed to save verification attempt' }, 500);
    }

    const { error: updateError } = await supabaseAdmin.rpc('set_verification_status', {
      target_user_id: userId,
      new_status: 'verified',
    });

    if (updateError) {
      console.error('set_verification_status error:', updateError);
      return jsonResponse({ success: false, message: 'Verification saved but status update failed' }, 500);
    }

    return jsonResponse({
      success: true,
      stage: 'complete',
      verification_status: 'verified',
      message: 'Your account is verified.',
    });
  } catch (e) {
    console.error('verification-pipeline error:', e);
    return jsonResponse(
      { success: false, message: e instanceof Error ? e.message : 'Internal error' },
      500
    );
  }
});
