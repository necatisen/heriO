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
   Çıktıyı `C:\MOBIL_APP\heriO\release\birthchat-v<versionName>-<versionCode>.aab` olarak kopyala, eskileri sil.
6. GitHub'a yedekle: `git add -A && git commit -m "<özet>" && git push origin main`.
7. Kullanıcıya AAB yolunu ve Play Console adımlarını kısaca bildir (`store/google-play/README.md`).

## Gizli bilgiler – ASLA commit etme

- İmza şifreleri `~/.gradle/gradle.properties` içinde. Supabase DB şifresi `C:\MOBIL_APP\heriO\secrets\` (repo dışında).
- `android/app/upload-keystore.jks`, `.env` gitignore'da. Depo herkese açık.

## Notlar

- SQL: `npx supabase db query --linked "<sql>"`. Şema: `supabase/schema_birthchat.sql` (canlı veritabanından üretildi).
- `storage.objects` SQL ile silinemez; dosya silme Storage API ile (bkz. `supabase/functions/delete-account`).
- Edge function'lar varsayılan JWT kontrolüyle deploy edilir (`npx supabase functions deploy <ad> --use-api`).
- Yüz doğrulama: telefonda ML Kit canlılık testi; sunucuda Azure Face anahtarı yoksa durum `pending` kalır.
- Supabase Auth: yeni projede "Confirm email" varsayılan açık — yayından önce kapatılmalı veya SMTP tanımlanmalı.
