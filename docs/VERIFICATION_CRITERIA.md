# Yüz Doğrulama – Kontrol Edilen Kriterler

Doğrulama akışında hangi kriterlerin nasıl kontrol edildiği.

---

## 1. Canlılık kontrolü (Liveness) – `verification-liveness-check`

Her adımda **Azure Face API** ile tek kare analiz edilir; **baş açısı (yaw)** kullanılır.

| Adım | Beklenen hareket | Kriter (yaw) | Geçince |
|------|-------------------|--------------|---------|
| **1. Sağa** | Baş sağa çevrilmeli | `yaw >= 18°` | 2. adıma geç |
| **2. Sola** | Baş sola çevrilmeli | `yaw <= -18°` | 3. adıma geç |
| **3. Kameraya bak** | Yüz ortada (düz) | `-12° <= yaw <= 12°` | Gönderim (submit) |

- **Yüz sayısı:** Tam 1 yüz olmalı → 0 ise `noFace`, 2+ ise `multipleFaces`.
- **Azure yoksa:** Edge Function 503 döner; uygulama “demo” modda yüz görünürse 2 kontrol sonrası adım ilerletilir (kriter atlanır).

**Sabitler (Edge Function):**
- `YAW_RIGHT_MIN = 18`
- `YAW_LEFT_MAX = -18`
- `YAW_CENTER_MIN = -12`, `YAW_CENTER_MAX = 12`

---

## 2. Doğrulama pipeline’ı – `verification-pipeline`

Gönderimde (selfie + liveness tamamlandıktan sonra) sırayla şunlar kontrol edilir:

### 2.1 Selfie (Adım 1)
- **Resim boyutu:** Base64 uzunluğu en az ~30.000 karakter (`MIN_SELFIE_BASE64_LENGTH`) – çok küçük/bozuk resim reddedilir.
- **Azure açıksa:**
  - Tam **1 yüz** tespit edilmeli (0 → no_face, 2+ → multiple_faces).
  - Yüz tespit edilirse bu adım geçer.

### 2.2 Yüz eşleştirme (Adım 2)
- **Profil fotoğrafı:** Kullanıcının profilinde `profile_picture` olmalı; yoksa `no_profile_photo` hatası.
- **Azure açıksa:**
  - Profil fotoğrafında en az 1 yüz tespit edilmeli.
  - Selfie ile profil fotoğrafı **Azure Face Verify** ile karşılaştırılır.
  - **Eşik:** `confidence >= 0.80` (`FACE_MATCH_THRESHOLD`) – bu değerin altı “profil fotoğrafıyla eşleşmiyor” sayılır.

### 2.3 Canlılık (Adım 3)
- **Liveness geçti mi:** Client’tan `liveness_passed === true` gelmeli.
- **Liveness kare sayısı:** En az **2** kare (`MIN_LIVENESS_FRAMES`) gönderilmiş olmalı.
- **Azure açıksa:** Her liveness karesinde yine tam **1 yüz** tespit edilmeli; aksi halde liveness başarısız.

### 2.4 Sonuç
- Tüm adımlar geçerse:
  - Selfie `verification-selfies` storage’a kaydedilir.
  - `verification_attempts` tablosuna kayıt düşülür.
  - `set_verification_status(user_id, 'pending')` ile kullanıcı **pending** (incelemede) yapılır.

---

## Özet tablo

| Aşama | Kontrol | Red sebebi |
|--------|--------|------------|
| Liveness – sağ | yaw ≥ 18° | Yüz yok, çok yüz, yaw yetersiz |
| Liveness – sol | yaw ≤ -18° | Aynı |
| Liveness – orta | -12° ≤ yaw ≤ 12° | Aynı |
| Pipeline – selfie | 1 yüz, resim yeterli boyut | No face, multiple faces, low quality |
| Pipeline – eşleşme | confidence ≥ 0.80 | No profile photo, face mismatch |
| Pipeline – liveness | liveness_passed + ≥2 kare, her karede 1 yüz | Liveness failed |

Azure Face API kapalıysa pipeline’da selfie/face match/liveness kareleri “mock” geçer; sadece profil fotoğrafı zorunluluğu ve liveness geçti + en az 2 kare koşulu uygulanır.
