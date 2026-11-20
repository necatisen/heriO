/**
 * Consent records (KVKK proof): who accepted which text version, when, from which app build.
 * Rows are append-only (no update/delete for clients). Email sign-ups cannot write yet (no session
 * before email confirmation), so their consents travel in auth user_metadata.consents and a
 * database trigger copies them into user_consents when the account is created.
 */
import { supabase } from '@/lib/supabase';
import { LEGAL_VERSION } from '@/lib/legal';
import { installedVersionCode } from '@/lib/appVersion';

export type ConsentType =
  | 'terms_privacy' // Terms of Use + Privacy Policy + 18+ declaration
  | 'kvkk_notice' // KVKK Aydınlatma Metni read
  | 'transfer_abroad' // explicit consent: transfer to Supabase/Google/Expo
  | 'biometric'; // explicit consent: face verification

/** Required at sign-up (email form and Google "complete profile"). */
export const SIGNUP_CONSENTS: ConsentType[] = ['terms_privacy', 'kvkk_notice', 'transfer_abroad'];

/** Payload for supabase.auth.signUp options.data.consents. */
export function signupConsentMetadata(types: ConsentType[] = SIGNUP_CONSENTS) {
  return { version: LEGAL_VERSION, accepted_at: new Date().toISOString(), app_version_code: installedVersionCode(), types };
}

export async function recordConsents(userId: string, types: ConsentType[]): Promise<void> {
  const rows = types.map((consent_type) => ({
    user_id: userId,
    consent_type,
    version: LEGAL_VERSION,
    granted: true,
    app_version_code: installedVersionCode(),
  }));
  const { error } = await supabase.from('user_consents').insert(rows);
  if (error) throw error;
}
