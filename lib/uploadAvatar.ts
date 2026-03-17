import * as FileSystemLegacy from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';

const BUCKET = 'avatars';

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** URI veya base64 ile avatar yükler; base64 varsa dosya okumaya gerek yok. */
async function uriOrBase64ToArrayBuffer(
  uri: string,
  base64?: string | null
): Promise<{ buffer: ArrayBuffer; mime: string }> {
  if (base64 && base64.length > 0) {
    return { buffer: base64ToArrayBuffer(base64), mime: 'image/jpeg' };
  }
  if (uri.startsWith('file://')) {
    const base64Data = await FileSystemLegacy.readAsStringAsync(uri, {
      encoding: FileSystemLegacy.EncodingType.Base64,
    });
    return { buffer: base64ToArrayBuffer(base64Data), mime: 'image/jpeg' };
  }
  const response = await fetch(uri, { method: 'GET' });
  if (typeof response.arrayBuffer === 'function') {
    const buffer = await response.arrayBuffer();
    return { buffer, mime: response.headers.get('content-type') || 'image/jpeg' };
  }
  throw new Error('Resim okunamadı. Lütfen galeriden tekrar seçin.');
}

function base64ToBufferAndMime(base64: string): { buffer: ArrayBuffer; mime: string } {
  return { buffer: base64ToArrayBuffer(base64), mime: 'image/jpeg' };
}

export async function uploadAvatarUri(
  userId: string,
  localUri: string,
  filename: string = 'avatar.jpg',
  base64?: string | null
): Promise<string> {
  const path = `${userId}/${filename}`;
  const { buffer, mime } = await uriOrBase64ToArrayBuffer(localUri, base64);

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: mime,
      upsert: true,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
}

/**
 * Galeri fotoğrafı için benzersiz dosya adı (avatarlarla karışmasın).
 */
export function galleryPhotoPath(userId: string, index: number): string {
  return `${userId}/gallery_${Date.now()}_${index}.jpg`;
}

export async function uploadGalleryPhoto(
  userId: string,
  localUriOrBase64: string,
  index: number,
  isBase64 = false
): Promise<string> {
  const path = galleryPhotoPath(userId, index);
  const { buffer, mime } = isBase64
    ? base64ToBufferAndMime(localUriOrBase64)
    : await uriOrBase64ToArrayBuffer(localUriOrBase64, null);

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: mime,
      upsert: false,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
}

/** Sohbet medyası: profil ile aynı mantık – avatars bucket, public URL, hızlı yükleme. */
export async function uploadChatImage(
  sessionId: string,
  userId: string,
  localUriOrBase64: string,
  isBase64 = false
): Promise<string> {
  const filename = `chat_${sessionId}_${Date.now()}.jpg`;
  return uploadAvatarUri(userId, localUriOrBase64, filename, isBase64 ? localUriOrBase64 : undefined);
}

/** Public URL'den Storage path çıkarır (…/object/public/bucket/path). */
function getStoragePathFromPublicUrl(publicUrl: string): string | null {
  const match = publicUrl.match(/\/object\/public\/[^/]+\/(.+?)(?:\?|$)/);
  return match ? match[1] : null;
}

/** Fotoğraf silindiğinde Storage'dan da kaldırır. */
export async function deletePhotoFromStorage(publicUrl: string): Promise<void> {
  const path = getStoragePathFromPublicUrl(publicUrl);
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
