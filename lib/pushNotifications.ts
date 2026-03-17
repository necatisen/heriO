/**
 * Push notification token registration for Expo.
 * Stores token in Supabase push_tokens for backend to send notifications (match, message, like).
 * expo-notifications yüklü değilse veya Expo Go (SDK 53+) ise sessizce atlanır.
 */
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

const platformKey = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

function isExpoGo(): boolean {
  try {
    const Constants = require('expo-constants').default;
    return Constants.appOwnership === 'expo';
  } catch {
    return false;
  }
}

function getNotifications(): typeof import('expo-notifications') | null {
  if (isExpoGo()) return null;
  try {
    return require('expo-notifications');
  } catch {
    return null;
  }
}

function getDevice(): typeof import('expo-device') | null {
  try {
    return require('expo-device');
  } catch {
    return null;
  }
}

export async function registerPushToken(userId: string): Promise<void> {
  if (Platform.OS === 'web' || isExpoGo()) return;

  try {
    const Notifications = getNotifications();
    const Device = getDevice();
    if (!Notifications || !Device?.isDevice) return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData?.data;
    if (!token) return;

    await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        token,
        platform: platformKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,platform' }
    );
  } catch (e) {
    console.warn('Push registration failed:', e);
  }
}

export function setNotificationHandler(): void {
  if (Platform.OS === 'web' || isExpoGo()) return;
  try {
    const Notifications = getNotifications();
    if (!Notifications) return;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (_) {}
}
