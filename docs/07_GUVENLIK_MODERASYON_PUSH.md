# 7. Güvenlik, Moderasyon ve Yayına Hazırlık

## Engelleme ve şikâyet
- **blocks tablosu:** `blocker_id` kullanıcısı `blocked_user_id` kullanıcısını engeller. Keşfet listesi engellenen kullanıcıları hariç tutar.
- **user_reports tablosu:** `reporter_id` → `reported_user_id`, `reason` (Spam, Taciz, Uygunsuz içerik, Sahte profil, Diğer). Raporlanan kullanıcılar mesaj rate limit’e tabidir.
- **Profil modal:** Başka kullanıcının profilinde "Şikâyet" ve "Engelle" butonları; sadece kendi profilinde gösterilmez.

## Kullanım şartları ve gizlilik
- **Kullanım Şartları:** Ayarlar → Yasal → Kullanım Şartları (`/legal/terms`).
- **Gizlilik Politikası:** Ayarlar → Yasal → Gizlilik Politikası (`/legal/privacy`).
- Metinler TR/EN; kendi hukuki ihtiyaçlarınıza göre avukat ile güncellenmelidir.

## Push bildirimleri
- **İstemci:** `expo-notifications` ile izin alınır, `getExpoPushTokenAsync()` ile token alınır, `push_tokens` tablosuna `user_id`, `token`, `platform` upsert edilir. Tab layout mount olduğunda (giriş yapmış kullanıcı) token kaydı yapılır.
- **Backend (bildirim gönderme):**
  - Uygulama match / mesaj / like oluştuğunda `notifications` tablosuna insert zaten yapılıyor.
  - Push göndermek için: Supabase Dashboard → Database → Webhooks ile `notifications` tablosunda INSERT sonrası bir Edge Function’a istek atılabilir.
  - Edge Function (`send-push`): Webhook payload’ında `user_id` ve bildirim içeriği alınır; `push_tokens` tablosundan (service role ile) ilgili kullanıcının token’ı okunur; Expo Push API’ye `POST https://exp.host/--/api/v2/push/send` ile bildirim gönderilir.
- **Expo Push API:** `to`: Expo push token, `title`, `body`, `data` (opsiyonel) alanları kullanılır.

## Mağaza gereksinimleri (App Store / Google Play)
- **App icon:** 1024x1024 (iOS), çeşitli boyutlar (Android). Kendi tasarımınız.
- **Splash / açılış ekranı:** Uygulama adı ve logo; `app.json` / `expo splash` ile yapılandırılır.
- **Kısa açıklama:** Mağaza listesinde görünen 1–2 cümle (örn. "Yakınınızdaki kişilerle eşleşin ve güvenli sohbet edin.").
- **Uzun açıklama:** Özellikler, Premium/Kredi, 18+ yaş uyarısı, iletişim.
- **Yaş sınırı:** 18+ (dating/sohbet uygulaması).
- **İçerik politikaları:** Kullanım şartları ve gizlilik politikası linkleri; uygunsuz içerik, taciz ve spam’e karşı kurallar dokümanda belirtilmiş olmalı.
