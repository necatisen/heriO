# heriO – çalışma kuralları

Expo 55 / React Native 0.83 tanışma uygulaması. Backend: Supabase (proje `mhqdanpmutrlefwzjukz`).
Google Play paket adı: `com.necatisen.nschatapp`.

## Her değişiklik isteğinden sonra (mobil dahil)

1. Değişikliği yap, `npx tsc --noEmit` ile değişen dosyalarda yeni hata olmadığını kontrol et.
2. Sürümü artır:
   - `app.json` → `expo.android.versionCode`: `yyyymmddNN` biçiminde ve her zaman öncekinden büyük (örn. 2026111001).
   - Görünen sürüm için gerekirse `npm run version:patch` (0.0.1 → 0.0.2).
3. AAB derle (Windows, ~5–20 dk):
   ```
   cd android && gradlew.bat bundleRelease -PreactNativeArchitectures=armeabi-v7a,arm64-v8a
   ```
   Çıktıyı `C:\MOBIL_APP\heriO\release\herio-v<versionName>-<versionCode>.aab` olarak kopyala, eskileri sil.
4. GitHub'a yedekle: `git add -A && git commit -m "<özet>" && git push origin main`.
5. Kullanıcıya AAB yolunu ve Play Console yükleme adımlarını kısaca bildir.

## Gizli bilgiler – ASLA commit etme

- İmza şifreleri `~/.gradle/gradle.properties` içinde (proje dosyasında değil).
- `android/app/upload-keystore.jks`, `.env` gitignore'da. Depo herkese açık.

## Notlar

- Supabase edge function'ları `--no-verify-jwt` ile deploy edilir (proje ES256 JWT kullanıyor).
- SQL: `npx supabase db query --linked "<sql>"`.
- Yüz doğrulama: telefonda ML Kit canlılık testi; sunucuda Azure Face anahtarı yoksa durum `pending` kalır.
