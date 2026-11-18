/**
 * Forced update check: compares this build's versionCode with
 * app_config.android_min_version_code (see migration 20261118090000).
 * Any error (offline, table missing, web) → no update required, so the app never locks up by mistake.
 */
import { Linking, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export const PLAY_PACKAGE = 'com.necatisen.birthchat';

export function installedVersionCode(): number | null {
  if (Platform.OS !== 'android') return null;
  try {
    const Application = require('expo-application');
    const n = parseInt(String(Application?.nativeBuildVersion ?? ''), 10);
    if (Number.isFinite(n)) return n;
  } catch {}
  try {
    const Constants = require('expo-constants').default;
    const n = Number(Constants?.expoConfig?.android?.versionCode);
    if (Number.isFinite(n) && n > 0) return n;
  } catch {}
  return null;
}

export async function isUpdateRequired(): Promise<boolean> {
  const current = installedVersionCode();
  if (current == null) return false;
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'android_min_version_code')
      .maybeSingle();
    if (error || !data) return false;
    const min = Number(data.value);
    return Number.isFinite(min) && current < min;
  } catch {
    return false;
  }
}

export async function openStoreListing(): Promise<void> {
  const market = `market://details?id=${PLAY_PACKAGE}`;
  try {
    await Linking.openURL(market);
  } catch {
    await Linking.openURL(`https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}`);
  }
}
