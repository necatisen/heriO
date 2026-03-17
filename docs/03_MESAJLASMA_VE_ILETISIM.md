# 3. Mesajlaşma ve İletişim Özellikleri

## Kredi / Premium Kuralı
- **Arkadaş** (friends tablosunda karşılıklı `accepted`) **veya** **Premium** (subscriptions.is_premium) ise mesaj **ücretsiz**.
- Aksi halde her mesaj için **1 kredi** düşer (`deduct_credits` RPC, `chat_spent`).
- Kredi yetersizse mesaj gönderilmez; kullanıcıya uyarı gösterilir.

## Okundu / read_at
- `messages` tablosunda: `is_read` (boolean), `read_at` (timestamptz).
- Alıcı sohbet ekranına girip mesajları gördüğünde, kendisine gelen okunmamış mesajlar `is_read = true`, `read_at = now()` ile güncellenir.
- Gönderen tarafında kendi mesajlarında okundu göstergesi: tek tik (gönderildi), çift tik (okundu).

## Medya (Resim / Video)
- **Storage:** `chat-media` bucket (private). Resim/video yükleme için hazır.
- **messages:** `attachment_url`, `attachment_type` ('image' | 'video').
- UI’de mesaj balonunda `attachment_url` varsa görsel önizleme (200x200) gösterilir. İleride gönderim butonu eklenebilir.

## Rate Limit / Spam
- **Normal:** Dakikada en fazla **30 mesaj** (aynı gönderen). Aşımda hata: "Message rate limit exceeded."
- **Şikâyet edilmiş kullanıcı:** `user_reports` tablosunda kendisi `reported_user_id` olarak en az 1 kayıt varsa limit **5 mesaj/dakika**.
- Şikâyet tablosu: `user_reports` (reporter_id, reported_user_id, reason). RLS: kendi şikâyetini ekleyebilir / kendi ile ilgili kayıtları görebilir.

## Migration’lar
1. **20260313170000_messages_read_media_rate_limit.sql**  
   read_at, attachment_url, attachment_type, indeksler, user_reports, rate limit trigger.
2. **20260313170100_storage_chat_media.sql**  
   `chat-media` bucket ve storage politikaları.

Supabase SQL Editor’da sırayla çalıştırın. Bucket oluşturma bazı ortamlarda Dashboard’dan yapılabilir; migration hata verirse Storage → Create bucket “chat-media” (private) + aynı politikaları elle ekleyin.
