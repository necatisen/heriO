import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';

const BUCKET = 'avatars';

// Phone photos are often 5-15 MB; the bucket limit is 5 MB.
// Every upload is resized to at most MAX_SIDE px and re-encoded as JPEG.
const MAX_SIDE = 1080;
const JPEG_QUALITY = 0.7;
const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const clean = base64.includes(',') ? base64.slice(base64.indexOf(',') + 1) : base64;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Resizes and compresses an image (file://, content://, blob: or data: URI) into a JPEG buffer. */
export async function compressImage(uri: string, maxSide = MAX_SIDE): Promise<ArrayBuffer> {
  let quality = JPEG_QUALITY;
  let side = maxSide;
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await manipulateAsync(uri, [{ resize: { width: side } }], {
      compress: quality,
      format: SaveFormat.JPEG,
      base64: true,
    });
    if (!result.base64) throw new Error('Resim işlenemedi. Lütfen başka bir fotoğraf seçin.');
    const buffer = base64ToArrayBuffer(result.base64);
    if (buffer.byteLength <= MAX_UPLOAD_BYTES) return buffer;
    quality -= 0.2;
    side = Math.round(side * 0.75);
  }
  throw new Error('Fotoğraf çok büyük. Lütfen başka bir fotoğraf seçin.');
}

async function uploadToBucket(path: string, localUri: string, upsert: boolean): Promise<string> {
  const buffer = await compressImage(localUri);
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: 'image/jpeg',
    upsert,
  });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  // Cache-buster so a replaced avatar is not served stale.
  return upsert ? `${urlData.publicUrl}?v=${Date.now()}` : urlData.publicUrl;
}

/** Uploads the profile avatar (overwrites the previous one). */
export async function uploadAvatarUri(
  userId: string,
  localUri: string,
  filename: string = 'avatar.jpg'
): Promise<string> {
  return uploadToBucket(`${userId}/${filename}`, localUri, true);
}

/** Gallery photos get a unique name so they never overwrite the avatar. */
export function galleryPhotoPath(userId: string, index: number): string {
  return `${userId}/gallery_${Date.now()}_${index}.jpg`;
}

export async function uploadGalleryPhoto(
  userId: string,
  localUri: string,
  index: number
): Promise<string> {
  return uploadToBucket(galleryPhotoPath(userId, index), localUri, false);
}

/** Chat images: same bucket and public URL as profile photos. */
export async function uploadChatImage(
  sessionId: string,
  userId: string,
  localUri: string
): Promise<string> {
  return uploadToBucket(`${userId}/chat_${sessionId}_${Date.now()}.jpg`, localUri, false);
}

/** Extracts the storage path from a public URL (…/object/public/bucket/path). */
function getStoragePathFromPublicUrl(publicUrl: string): string | null {
  const match = publicUrl.match(/\/object\/public\/[^/]+\/(.+?)(?:\?|$)/);
  return match ? match[1] : null;
}

/** Removes a photo from storage when it is deleted. */
export async function deletePhotoFromStorage(publicUrl: string): Promise<void> {
  const path = getStoragePathFromPublicUrl(publicUrl);
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
