/**
 * Client API for the 4-stage verification pipeline.
 * Calls Supabase Edge Function verification-pipeline.
 */

import { supabase } from '@/lib/supabase';

export type VerificationStage = 'selfie_capture' | 'face_match' | 'liveness' | 'complete';
export type VerificationFailureCode =
  | 'no_face'
  | 'multiple_faces'
  | 'low_quality'
  | 'face_out_of_frame'
  | 'face_mismatch'
  | 'liveness_failed'
  | 'no_profile_photo'
  | 'invalid_image';

export type VerificationResult =
  | { success: true; verification_status: 'pending' | 'verified'; message: string }
  | {
      success: false;
      stage: VerificationStage;
      code?: VerificationFailureCode;
      message: string;
    };

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function getAccessToken(): Promise<string | null> {
  // On native, session can be null briefly while SecureStore loads.
  for (let i = 0; i < 2; i++) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
    await sleep(350);
  }
  return null;
}

export async function submitVerification(
  selfieBase64: string,
  livenessPassed: boolean,
  livenessFrames?: string[]
): Promise<VerificationResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return {
      success: false,
      stage: 'selfie_capture',
      message: 'Not authenticated. Please sign in again.',
    };
  }

  if (!SUPABASE_URL) {
    return {
      success: false,
      stage: 'selfie_capture',
      message: 'Configuration error.',
    };
  }

  const url = `${SUPABASE_URL}/functions/v1/verification-pipeline`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {}),
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      selfie_base64: selfieBase64,
      liveness_passed: livenessPassed,
      liveness_frames: livenessFrames ?? [],
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      success: false,
      stage: (data.stage as VerificationStage) || 'selfie_capture',
      code: data.code,
      message: data.message || `Request failed (${res.status})`,
    };
  }

  if (data.success) {
    return {
      success: true,
      verification_status: data.verification_status || 'pending',
      message: data.message || 'Verification submitted.',
    };
  }

  return {
    success: false,
    stage: (data.stage as VerificationStage) || 'selfie_capture',
    code: data.code,
    message: data.message || 'Verification failed.',
  };
}

/** Adım: 'right' | 'left' | 'blink'. AI kameradaki baş pozisyonunu analiz eder. */
export type LivenessStep = 'right' | 'left' | 'blink';

export type LivenessCheckResult = {
  complete: boolean;
  next?: 'left' | 'blink' | 'submit';
  noFace?: boolean;
  multipleFaces?: boolean;
  yaw?: number;
  error?: string;
};

export async function checkLivenessStep(
  imageBase64: string,
  step: LivenessStep
): Promise<LivenessCheckResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { complete: false, error: 'Not authenticated' };
  }

  const url = `${SUPABASE_URL}/functions/v1/verification-liveness-check`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {}),
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ image_base64: imageBase64, step }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { complete: false, error: data.error || `Request failed (${res.status})` };
  }

  return {
    complete: data.complete === true,
    next: data.next,
    noFace: data.noFace === true,
    multipleFaces: data.multipleFaces === true,
    yaw: data.yaw,
    error: data.error,
  };
}
