# 1. Madde: Supabase Şeması ve Güvenlik — Tamamlandı

## Özet

Online veritabanı, gerçek kullanıcı verisini güvenli tutacak şekilde RLS ile korunmuş ve üretime hazır hale getirildi.

---

## Yapılanlar

### Tablo tasarımı (SQL)
- **Tablolar:** `profiles`, `likes`, `friends`, `chat_sessions`, `messages`, `credits`, `credit_transactions`, `subscriptions`, `photos`, `notifications`, `profile_views` (+ eski migration’larda `blocks`, `chat_history`)
- **İlişkiler:** `auth.users` referansları, foreign key’ler, unique ve check constraint’ler tanımlı.
- **Dosya:** `project/supabase_schema.sql` (tek dosyada tablo + RLS + RPC).

### RLS ve politikalar
- Tüm ilgili tablolarda RLS açık.
- Her tablo için sadece ilgili kullanıcıya ait satırları okuma/yazma kuralları tanımlı.
- **Örnek:** `messages` sadece o chat oturumunun iki kullanıcısı tarafından görülebilir (session bazlı policy).

### RPC fonksiyonları
- **`deduct_credits(p_user_id, p_amount, p_type?, p_description?)`**  
  Atomik kredi düşme, negatif bakiye engeli, yetki kontrolü (kendi user_id veya service_role).
- **`delete_user_account()`**  
  Giriş yapan kullanıcının verilerini güvenli şekilde siler/anonymize eder; chat tarafında karşı tarafı bozmadan mesajları anonymize eder, en sonda `auth.users` kaydını siler.

### Trigger
- **`add_initial_credits`**  
  Yeni profil oluşunca otomatik `credits` satırı (1000 bakiye) ve `credit_transactions` kaydı oluşturur.

---

## Test senaryoları (manuel)

Aşağıdaki akışları uygulama + Supabase üzerinde manuel test edebilirsin.

| # | Akış | Beklenen |
|---|------|----------|
| 1 | **Kayıt** | Uygulamadan yeni kullanıcı kaydı → `profiles` satırı oluşur, `credits` ve `credit_transactions` (initial) otomatik gelir. |
| 2 | **Login** | Kayıtlı kullanıcı ile giriş → Session oluşur, Table Editor’da `profiles` görünür. |
| 3 | **Mesaj atma** | İki kullanıcı eşleşip sohbet açar, mesaj gönderir → `chat_sessions` ve `messages` satırları artar; 3. kullanıcı bu mesajları göremez (RLS). |
| 4 | **Arkadaşlık** | Beğeni/eşleşme → `likes` ve `friends` (accepted) kayıtları oluşur. |
| 5 | **Kredi düşmesi** | Mesaj gönderirken (premium/arkadaş değilse) uygulama `rpc('deduct_credits', ...)` çağırır → Bakiye düşer, negatif olamaz; yetersiz kredide hata. |
| 6 | **Hesap silme** | Ayarlardan “Hesabı sil” → `delete_user_account()` çalışır; profil anonymize, ilgili veriler silinir, auth user kaldırılır. |

### SQL tarafında hızlı kontrol (isteğe bağlı)

Supabase **SQL Editor**’da:

```sql
-- Tabloları listele
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

-- Fonksiyonları listele
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
```

`deduct_credits` ve `delete_user_account` listede görünmeli.

---

## Çıktı dosyaları

- **`project/supabase_schema.sql`** — Tüm tablo + policy + RPC tanımları (Supabase SQL Editor’da çalıştırılabilir).
- **`project/supabase/migrations/`** — Mevcut migration’lar (db push veya Editor’da sırayla çalıştırılabilir).

---

**1. madde tamamlandı.** Sonraki adım: 2. madde (Keşfet / Eşleşme deneyimi) veya ihtiyacına göre diğer maddeler.
