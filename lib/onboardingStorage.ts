import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'has_seen_onboarding';

export async function getOnboardingSeen(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(KEY);
  }
  // SecureStore can be cleared in some dev scenarios; keep a fallback in AsyncStorage.
  const secure = await SecureStore.getItemAsync(KEY);
  if (secure) return secure;
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function setOnboardingSeen(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, 'true');
    return;
  }
  await SecureStore.setItemAsync(KEY, 'true');
  try {
    await AsyncStorage.setItem(KEY, 'true');
  } catch {}
}
