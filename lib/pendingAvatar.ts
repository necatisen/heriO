/**
 * Profile photo chosen during sign-up when "Confirm email" is on: there is no session yet,
 * so the photo cannot be uploaded. It is copied into app storage and uploaded right after
 * the user's first sign-in.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import { uploadAvatarUri } from '@/lib/uploadAvatar';

const KEY = 'pending_avatar';

function storage() {
  try {
    return require('@react-native-async-storage/async-storage').default as {
      getItem: (k: string) => Promise<string | null>;
      setItem: (k: string, v: string) => Promise<void>;
      removeItem: (k: string) => Promise<void>;
    };
  } catch {
    return null;
  }
}

/** Keeps a copy of the picked photo for the given new account. */
export async function savePendingAvatar(userId: string, uri: string): Promise<void> {
  const dir = FileSystem.documentDirectory;
  if (!dir) return;
  const target = `${dir}pending-avatar-${userId}.jpg`;
  await FileSystem.copyAsync({ from: uri, to: target });
  await storage()?.setItem(KEY, JSON.stringify({ userId, uri: target }));
}

/** Uploads a saved sign-up photo for this user (if any). Returns true when the profile photo was set. */
export async function uploadPendingAvatar(userId: string): Promise<boolean> {
  const s = storage();
  const raw = await s?.getItem(KEY);
  if (!raw) return false;
  let pending: { userId: string; uri: string };
  try {
    pending = JSON.parse(raw);
  } catch {
    await s?.removeItem(KEY);
    return false;
  }
  if (pending.userId !== userId) return false;

  const info = await FileSystem.getInfoAsync(pending.uri);
  if (!info.exists) {
    await s?.removeItem(KEY);
    return false;
  }
  const url = await uploadAvatarUri(userId, pending.uri, 'avatar.jpg');
  const { error } = await supabase.from('profiles').update({ profile_picture: url }).eq('id', userId);
  if (error) throw error;
  await supabase.from('photos').insert({ user_id: userId, photo_url: url });
  await s?.removeItem(KEY);
  await FileSystem.deleteAsync(pending.uri, { idempotent: true });
  return true;
}
