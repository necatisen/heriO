# 6. Premium ve Kredi Modeli

## Ürün kuralları (kâğıt üzerinde)

### Premium neleri açar?
- **Sınırsız mesaj:** Arkadaş olmasanız da herkese mesaj atabilirsiniz (kredi harcanmaz).
- **Gelişmiş filtreler:** Tüm filtre seçenekleri açık (yaş, mesafe, boy, vücut tipi, din, sigara/alkol, çocuk, dil, şehir/ülke, doğrulanmış, çevrimiçi).
- **Ziyaretçi listesi tam görünüm:** Profilinizi kim gördü listesine tam erişim (ileride eklenebilir).
- **Öne çıkan profil:** Keşfet’te daha üst sıralarda gösterilme (ileride eklenebilir).

### Kredi neleri açar?
- **Mesaj:** Premium değilseniz, arkadaş olmayan biriyle **her mesaj 1 kredi** harcar. Arkadaşlarla mesajlaşma **ücretsiz**.
- **Profil boost / ek özellikler:** İleride kredi ile satın alınabilir ek özellikler tanımlanabilir.

### Kontrol noktaları
- **Mesaj gönderirken:** `subscriptions.is_premium` veya arkadaşlık kontrolü; değilse `credits.balance` ≥ 1 ve `deduct_credits` RPC (uygulama: `conversation/[id].tsx`).
- **Gelişmiş filtre / ziyaretçi / like listesi:** Ekran açılışında `subscriptions` ve `credits` tekrar çekilebilir; premium/credits durumu backend’deki tablolarla aynı kalır.

## Teknik entegrasyon planı
- **İlk aşama:** Mağaza ekranları + **sahte ödeme** akışı (test için “Satın al” → simülasyon başarılı → isteğe bağlı Supabase güncellemesi).
- **İkinci aşama:**  
  - **Android:** Google Play Billing (In-App Purchases).  
  - **iOS:** StoreKit (In-App Purchases).  
  Satın alma doğrulandıktan sonra backend’de `subscriptions` / `credits` güncellenir (webhook veya cihazdan doğrulama).

## Mağaza ekranları
- **Mağaza (hub):** “Premium ol” ve “Kredi satın al” kartları; profil/ayarlardan erişim.
- **Premium ol:** Avantaj listesi + fiyat + “Premium Yap” butonu → (şimdilik) sahte ödeme.
- **Kredi satın al:** Paket listesi (örn. 50 / 150 / 500 kredi) + “Satın al” → (şimdilik) sahte ödeme.
