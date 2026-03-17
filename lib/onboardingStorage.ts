import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'has_seen_onboarding';

export async function getOnboardingSeen(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(KEY);
  }
  return SecureStore.getItemAsync(KEY);
}

export async function setOnboardingSeen(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, 'true');
    return;
  }
  await SecureStore.setItemAsync(KEY, 'true');
}
