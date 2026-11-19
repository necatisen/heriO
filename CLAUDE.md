# Birthchat – çalışma kuralları

Expo 55 / React Native 0.83 tanışma ve sohbet uygulaması.
- Backend: Supabase, proje `qdizonkrsvcyjqjxcmxp` (**Frankfurt, eu-central-1**). Eski Seul projesi `mhqdanpmutrlefwzjukz` artık kullanılmıyor.
- Google Play paket adı: `com.necatisen.birthchat` (yeni uygulama). Sürüm 1.0.0'dan başlar.
- Marka: `lib/brand.ts` (lacivert gece zemini + mavi→mor→pembe gradyan), logo kaynağı `assets/images/birthchat-logo-source.jpg`.

## Dil (7 dil zorunlu: tr, en, de, fr, es, ru, ar)

- Ekranda görünen **her** metin `L('Türkçe', 'English')` ile yazılır (`lib/l10n.ts`). Değişken: `L('{0} mesaj', '{0} messages', [n])`.
- `language === 'tr' ? ... : ...` ile metin yazma. Diğer diller `lib/locales/<dil>.json` içinde Türkçe metin anahtarıyla tutulur.
- Yeni metin ekledikten sonra: `node scripts/i18n-check.cjs --write-source --hardcoded` → eksik çevirileri 5 dosyaya ekle, `problems=0` olmalı.
- Dil hesaba kaydedilir (`profiles.preferred_language`); girişte hesabın dili uygulanır.

## Her değişiklik isteğinden sonra (mobil dahil)

1. Değişikliği yap; `npx tsc --noEmit` ile değişen dosyalarda yeni hata olmadığını kontrol et.
2. `node scripts/i18n-check.cjs` → `problems=0`.
3. Backend değiştiyse: `SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/e2e-backend-test.cjs` → hepsi PASS.
4. Sürüm kodunu artır: `app.json` → `expo.android.versionCode` (+1). Görünen sürüm gerekirse `npm run version:patch`.
5. AAB derle (Windows, ~5–20 dk, bilgisayar uykuya geçmemeli):
   ```
   cd android && gradlew.bat bundleRelease -PreactNativeArchitectures=armeabi-v7a,arm64-v8a
   ```
   Çıktıyı `C:\MOBIL_APP\BirthChat\release\birthchat-v<versionName>-<versionCode>.aab` olarak kopyala, eskileri sil.
   Proje klasörü taşınır/yeniden adlandırılırsa önce `android/build`, `android/app/.cxx`, `android/app/build` ve `node_modules/**/android/{.cxx,build}` silinmeli (eski yolu önbellekte tutar).
6. GitHub'a yedekle: `git add -A && git commit -m "<özet>" && git push origin main`.
7. Kullanıcıya AAB yolunu ve Play Console adımlarını kısaca bildir (`store/google-play/README.md`).
   Her derlemeden sonra Play Console "Sürüm bilgileri" için kopyalanmaya hazır şunları da ver:
   - **Sürüm adı** (≤50 karakter): `<versionName> (<versionCode>) – <kısa özet>`
   - **Sürüm notları**: önceki AAB'den bu yana kullanıcının gördüğü değişiklikler, `<tr-TR>…</tr-TR>` ve `<en-US>…</en-US>` etiketleriyle, ikisi tek blokta (dil başına ≤500 karakter).

## Yasal sayfalar (Google Play)

- Ayrı depo: github.com/necatisen/birthchat → https://necatisen.github.io/birthchat/ (yerel kopya `C:\MOBIL_APP\birthchat-site`).
- Kaynak metin `lib/legal.ts`; değiştirince `node scripts/generate-legal-docs.cjs` çalıştır, sonra birthchat-site deposunu commit + push et.
- Destek e-postası: birthchathelp@gmail.com.

## Gizli bilgiler – ASLA commit etme

- İmza şifreleri `~/.gradle/gradle.properties` içinde. Supabase DB şifresi `C:\MOBIL_APP\BirthChat\secrets\` (repo dışında).
- `android/app/upload-keystore.jks`, `.env` gitignore'da. Depo herkese açık.

## Notlar

- SQL: `npx supabase db query --linked "<sql>"`. Şema: `supabase/schema_birthchat.sql` (canlı veritabanından üretildi).
- `storage.objects` SQL ile silinemez; dosya silme Storage API ile (bkz. `supabase/functions/delete-account`).
- Edge function'lar varsayılan JWT kontrolüyle deploy edilir (`npx supabase functions deploy <ad> --use-api`).
- Yüz doğrulama: telefonda ML Kit canlılık testi; geçerse `verification-pipeline` otomatik onaylar (`verified`). Azure Face anahtarı tanımlanırsa ek olarak selfie ↔ profil fotoğrafı eşleştirmesi yapılır.
- Supabase Auth: yeni projede "Confirm email" varsayılan açık — yayından önce kapatılmalı veya SMTP tanımlanmalı.
- Mesaj metni (`messages.content`) veritabanında şifreli (`enc1:…`, AES-256, anahtar Vault'ta `message_encryption_key`). Trigger yazarken şifreler; uygulama okurken `lib/messageCrypto.ts` → `get_message_texts` RPC kullanır. Mesaj okuyan her yeni kod `decryptMessages()` çağırmalı.
- Push: Expo push → FCM. `android/app/google-services.json` (Firebase) varsa Gradle eklentisi otomatik uygulanır; FCM V1 servis hesabı anahtarı expo.dev → Credentials'a yüklenmeli. Kanal: `messages`.
- Şifre sıfırlama linki `birthchat://auth/reset-password` ekranına döner (`app/auth/reset-password.tsx`).
