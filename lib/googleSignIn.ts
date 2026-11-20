/**
 * Native Google Sign-In (Android account picker) → Supabase signInWithIdToken.
 * The consent UI shows the app name "Birthchat" instead of the Supabase callback domain.
 * Google matches the installed app by package name + signing SHA-1 (Android OAuth clients in
 * Google Cloud project birthchat-b32a9); the ID token is issued for the Web client below,
 * which is the client configured in Supabase → Auth → Google.
 */
import { Platform } from 'react-native';

/** OAuth "Web application" client (public identifier, not a secret). */
export const GOOGLE_WEB_CLIENT_ID = '1036373414256-5rjq5ob9ufvpg99g5re8d0an4dcf78eq.apps.googleusercontent.com';

type GoogleModule = typeof import('@react-native-google-signin/google-signin');

let configured = false;

function loadModule(): GoogleModule | null {
  if (Platform.OS !== 'android') return null;
  try {
    const mod: GoogleModule = require('@react-native-google-signin/google-signin');
    if (!configured) {
      mod.GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
      configured = true;
    }
    return mod;
  } catch {
    return null; // Expo Go / module not linked
  }
}

export class GoogleSignInCancelled extends Error {
  constructor() {
    super('Google sign-in cancelled');
  }
}

/**
 * Returns a Google ID token, or null when the native flow is unavailable on this device/build
 * (caller then falls back to the browser OAuth flow). Throws GoogleSignInCancelled on cancel.
 */
export async function getGoogleIdToken(): Promise<string | null> {
  const mod = loadModule();
  if (!mod) return null;
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = mod;
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Always show the account picker instead of silently reusing the last account.
    await GoogleSignin.signOut().catch(() => {});
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res)) throw new GoogleSignInCancelled();
    return res.data.idToken ?? null;
  } catch (e) {
    if (e instanceof GoogleSignInCancelled) throw e;
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) throw new GoogleSignInCancelled();
    // DEVELOPER_ERROR (e.g. a local build whose SHA-1 is not registered), no Play services, …
    console.warn('Native Google sign-in unavailable, using browser flow:', (e as any)?.code ?? e);
    return null;
  }
}

export async function googleSignOut(): Promise<void> {
  const mod = loadModule();
  if (!mod) return;
  await mod.GoogleSignin.signOut().catch(() => {});
}
