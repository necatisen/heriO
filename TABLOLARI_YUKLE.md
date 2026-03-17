# Tabloları Supabase'e Yükleme

## Adımlar

1. **Supabase Dashboard** aç: https://supabase.com/dashboard → projeni seç (mhqdanpmutrlefwzjukz).

2. Sol menüden **SQL Editor** → **New query**.

3. Bu projedeki **`supabase_schema.sql`** dosyasını aç:
   - Konum: `project/supabase_schema.sql`
   - Dosyanın **tüm içeriğini** kopyala (Ctrl+A, Ctrl+C).

4. SQL Editor’daki boş alana **yapıştır** (Ctrl+V).

5. **Run** (veya Ctrl+Enter) ile çalıştır.

6. Hata yoksa tüm tablolar, RLS politikaları ve fonksiyonlar (`add_initial_credits`, `deduct_credits`, `delete_user_account`) oluşur.

## Oluşan tablolar

- profiles, photos, likes, friends, chat_sessions, messages  
- credits, credit_transactions, subscriptions  
- notifications, profile_views  

## Kontrol

- **Table Editor**: Tablolar listelenir.
- **Database → Functions**: `deduct_credits`, `delete_user_account` görünür.
