# 5. Fotoğraf Yükleme ve Depolama (Supabase Storage)

## Bucket tasarımı
- **Bucket adı:** `avatars` (tek bucket; profil + galeri fotoğrafları).
- **Erişim:** Public. Profil ve galeri resimleri herkese açık URL ile gösterildiği için performans ve basitlik tercih edildi. İleride hassas içerik eklenirse ayrı bir private bucket + signed URL kullanılabilir.
- **Limitler:** 5 MB dosya, `image/jpeg`, `image/png`, `image/gif`, `image/webp`.
- **Path yapısı:** `{user_id}/avatar.jpg` (profil), `{user_id}/gallery_{timestamp}_{index}.jpg` (galeri).

## Yükleme akışı
- **Yardımcı:** `lib/uploadAvatar.ts`
  - `uploadAvatarUri(userId, localUri)` — kayıt sonrası profil fotoğrafı.
  - `uploadGalleryPhoto(userId, localUriOrBase64, index, isBase64)` — galeriden ekleme (uri veya base64).
- ImagePicker’dan gelen dosya bu yardımcılarla Supabase Storage’a yüklenir; dönen **public URL** kullanılır.
- **photos tablosu:** Sadece `user_id`, `photo_url` (Storage URL’i), `created_at`. Ek metadata ihtiyacında sütun eklenebilir.

## Profil fotoğrafı mantığı
- **İlk fotoğraf:** İlk yüklenen galeri fotoğrafı otomatik olarak `profiles.profile_picture` yapılıyor.
- **“Profil fotoğrafı yap”:** Galeri kartında uzun basınca açılan menüden herhangi bir fotoğraf “Profil fotoğrafı yap” ile profil fotoğrafı olarak atanıyor; `profiles.profile_picture` güncelleniyor.
- Profil fotoğrafı olan kartta küçük rozet (ikon) gösteriliyor.

## Silme ve güncelleme
- **Foto silindiğinde:**
  1. **Storage:** `deletePhotoFromStorage(photoUrl)` ile public URL’den path çıkarılıp `avatars` bucket’tan dosya siliniyor.
  2. **Veritabanı:** `photos` tablosundan ilgili satır siliniyor.
- **Profil fotoğrafı silinirse:** Kalan fotoğraflar arasından ilki `profiles.profile_picture` yapılıyor; hiç kalmadıysa `profile_picture` null yapılıyor (mevcut davranış).

## Kullanılan API
- `supabase.storage.from('avatars').upload(path, buffer, options)`
- `supabase.storage.from('avatars').getPublicUrl(path)`
- `supabase.storage.from('avatars').remove([path])`
- Path, public URL’den `getStoragePathFromPublicUrl()` ile türetiliyor (internal kullanım).
