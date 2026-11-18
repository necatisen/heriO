/**
 * Push notifications (Expo push service → FCM on Android).
 * Stores the device token in Supabase push_tokens so the send-push-message function can reach it.
 * Skipped silently on web and in Expo Go.
 */
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { L } from '@/lib/l10n';
import { installedVersionCode } from '@/lib/appVersion';

const platformKey = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
/** Android channel used by chat messages (must match channelId in send-push-message). */
export const MESSAGE_CHANNEL_ID = 'messages';

/** Conversation currently on screen; its own message notifications are not shown as banners. */
let activeSessionId: string | null = null;
export function setActiveConversation(sessionId: string | null) {
  activeSessionId = sessionId;
}

function isExpoGo(): boolean {
  try {
    const Constants = require('expo-constants').default;
    return Constants.appOwnership === 'expo';
  } catch {
    return false;
  }
}

function getNotifications(): typeof import('expo-notifications') | null {
  if (Platform.OS === 'web' || isExpoGo()) return null;
  try {
    return require('expo-notifications');
  } catch {
    return null;
  }
}

function getProjectId(): string | undefined {
  try {
    const Constants = require('expo-constants').default;
    return Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  } catch {
    return undefined;
  }
}

/** Android 8+: notifications need a channel; Android 13+ only shows the permission prompt once one exists. */
async function ensureChannel(Notifications: typeof import('expo-notifications')) {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(MESSAGE_CHANNEL_ID, {
    name: L('Mesajlar', 'Messages'),
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 150, 250],
    lightColor: '#FF4F8B',
    sound: 'default',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    showBadge: true,
  });
}

async function saveToken(userId: string, token: string) {
  const { error } = await supabase.from('push_tokens').upsert(
    { user_id: userId, token, platform: platformKey, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,platform' }
  );
  if (error) throw new Error(`save_failed: ${error.message}`);
}

/** Records how the last registration ended (push_diagnostics), so failures are visible on the server. */
async function report(userId: string, stage: string, detail?: string) {
  try {
    await supabase.from('push_diagnostics').upsert(
      {
        user_id: userId,
        platform: platformKey,
        stage,
        detail: detail ? detail.slice(0, 500) : null,
        app_version_code: installedVersionCode(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,platform' }
    );
  } catch {}
}

let tokenSub: { remove: () => void } | null = null;

export async function registerPushToken(userId: string): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  try {
    let Device: typeof import('expo-device') | null = null;
    try {
      Device = require('expo-device');
    } catch {}
    if (Device && !Device.isDevice) {
      await report(userId, 'not_device');
      return;
    }

    await ensureChannel(Notifications);

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') {
      await report(userId, 'permission_denied', String(status));
      return;
    }

    let token: string | undefined;
    try {
      token = (await Notifications.getExpoPushTokenAsync({ projectId: getProjectId() })).data;
    } catch (e: any) {
      await report(userId, 'token_failed', `${e?.code ?? ''} ${e?.message ?? e}`.trim());
      return;
    }
    if (!token) {
      await report(userId, 'token_failed', 'empty token');
      return;
    }
    try {
      await saveToken(userId, token);
    } catch (e: any) {
      await report(userId, 'save_failed', String(e?.message ?? e));
      return;
    }
    await report(userId, 'ok');

    // FCM may rotate the device token; keep the stored Expo token fresh.
    tokenSub?.remove();
    tokenSub = Notifications.addPushTokenListener(async () => {
      try {
        const { data } = await Notifications.getExpoPushTokenAsync({ projectId: getProjectId() });
        if (data) await saveToken(userId, data);
      } catch {}
    });
  } catch (e: any) {
    console.warn('Push registration failed:', e);
    await report(userId, 'error', String(e?.message ?? e));
  }
}

/** Removes this device's token on sign-out so the next account on the phone doesn't get these messages. */
export async function unregisterPushToken(userId: string): Promise<void> {
  if (!getNotifications()) return;
  tokenSub?.remove();
  tokenSub = null;
  try {
    await supabase.from('push_tokens').delete().eq('user_id', userId).eq('platform', platformKey);
  } catch {}
}

export function setNotificationHandler(): void {
  const Notifications = getNotifications();
  if (!Notifications) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async (n) => {
        const data: any = n?.request?.content?.data || {};
        const sid = data.session_id || data.sessionId;
        const hide = !!sid && sid === activeSessionId; // already looking at this chat
        return {
          shouldShowAlert: !hide,
          shouldShowBanner: !hide,
          shouldShowList: !hide,
          shouldPlaySound: !hide,
          shouldSetBadge: true,
        };
      },
    });
  } catch (_) {}
}
