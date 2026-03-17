# 4. Profil, Onboarding ve Doğrulama

## Kayıt formu
- **Zorunlu alanlar:** E-posta, şifre, şifre tekrar, ad soyad, kullanıcı adı, yaş (18+), cinsiyet, ülke, şehir, **en az bir profil fotoğrafı**.
- **İsteğe bağlı:** Boy, kilo, eğitim, meslek, vücut tipi, çocuk durumu, sigara/alkol, din, ilişki durumu. Kullanıcı "İsteğe bağlı — sonra ekleyebilirsiniz" bölümünden doldurur veya profilde sonra tamamlar.
- Kayıt sonrası seçilen fotoğraf Supabase Storage **avatars** bucket’ına yüklenir; `profiles.profile_picture` ve `photos` tablosu güncellenir.

## Fotoğraf yönetimi
- **avatars** bucket (Storage): Profil ve galeri fotoğrafları. Public; path `{user_id}/avatar.jpg` veya `{user_id}/gallery_*.jpg`.
- **Profil ekranı:** Galeriden seçilen fotoğraflar `uploadGalleryPhoto` ile Storage’a yüklenir; dönen public URL `photos` ve (ilk fotoğrafsa) `profiles.profile_picture` olarak kaydedilir.
- Yardımcı: `lib/uploadAvatar.ts` (`uploadAvatarUri`, `uploadGalleryPhoto`).

## Onboarding turu
- **İlk girişte** (yeni kayıt veya hiç onboarding izlenmemişse) 3 ekran:
  1. **Ne yapabilirsin?** — İnsanlarla tanış, filtrele, sohbet et.
  2. **Güvenlik** — Kural ihlallerine tolerans yok.
  3. **Kredi ve Premium** — Arkadaşlarla ücretsiz mesaj; Premium veya kredi ile devam.
- Tamamlanınca `AsyncStorage` ile `has_seen_onboarding = true` işaretlenir; bir daha gösterilmez.
- Ekran: `app/onboarding.tsx`. Yönlendirme: `app/index.tsx` (session varsa onboarding/tabs kontrolü).

## Doğrulama (ileri aşama)
- **E-posta doğrulaması:** Supabase Dashboard → Authentication → Providers → Email → **Confirm email** açılabilir. Açıksa kayıt sonrası kullanıcıya "E-postanı doğrula" mesajı gösterilebilir; doğrulama linki Supabase tarafından gönderilir.
- **Telefon / yüz doğrulama:** Sonraki sprint’lerde planlanabilir; yasal çerçeve ve gizlilik politikası hazırlandıktan sonra entegre edilmesi önerilir.

## Migration
- **20260313180000_storage_avatars.sql:** `avatars` bucket ve Storage RLS politikaları. Supabase SQL Editor’da çalıştırın; bucket oluşturma hata verirse Dashboard → Storage → New bucket **avatars** (public, 5MB, image/*) ile oluşturup politikaları elle ekleyin.
