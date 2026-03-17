# Premium: Jaumo Mantığı vs Bizim Uygulama – Çalışma Planı

## 1. Jaumo’da Premium (VIP) Mantığı – Özet

| Özellik | Ücretsiz | Premium (VIP) |
|--------|----------|----------------|
| **Reklam** | Var | Reklamsız |
| **Mesaj** | 5 mesaj/gün limit | Sınırsız mesaj |
| **İlk mesaj** | Her iki taraf da yazabiliyor (limit dahilinde) | Sınırsız |
| **Beğeni** | Günde ~20 beğeni | Sınırsız (veya daha yüksek) |
| **Beğenileri görme** | Temel erişim | Tam liste / öne çıkan |
| **Filtreler** | Basit | Gelişmiş (boy, vücut tipi, dil, eğitim, ilişki durumu vb.) |
| **Ziyaretçi / “Kim baktı”** | Sınırlı veya blur | Tam liste |
| **Profil görünürlüğü** | Normal | Boost (öne çıkarma) |
| **Okundu bilgisi** | Yok veya kısıtlı | “Mesajımı kim okudu” |
| **Geri alma (rewind)** | Yok | Sola kaydırdığın profilleri tekrar görme |
| **Gizlilik** | Standart | Yaş / bilgi gizleme |
| **Fiyat** | — | ~$7.99–12.49/ay, ~$49.99–74.99/yıl |

Kaynak: Genel Jaumo incelemeleri ve mağaza açıklamaları (2025–2026).

---

## 2. Bizim Uygulamada Şu An Ne Var?

| Özellik | Durum | Not |
|--------|--------|-----|
| **Premium abonelik** | Var | `subscriptions.is_premium`, fake-payment ile açılabiliyor |
| **Mesaj – arkadaş dışı** | Var | Ücretsiz: kredi/mesaj. Premium: sınırsız. Arkadaşla her zaman ücretsiz. |
| **Günlük mesaj limiti** | Yok | Jaumo’daki “5 mesaj/gün” yok; bizde kredi veya premium var. |
| **Beğeni günlük limiti** | Yok | Keşfet’te günlük beğeni sınırı yok. |
| **Beğeniler (gelen/giden)** | Var | Liste var; premium’a özel kısıtlama yok. |
| **Ziyaretçiler** | Var | Liste var; **premium kısıtı yok** – herkes tam listeyi görüyor. |
| **Filtreler** | Var | Keşfet’te filtreler var; **premium’a özel filtre kiliti yok**. |
| **Keşfet sıralama (boost)** | Yok | Premium’a “öne çıkan profil” deniyor ama **sıralama/boost uygulanmıyor**. |
| **Okundu bilgisi** | Var | `is_read` / read_at var; **premium’a özel değil**, herkeste açık. |
| **Geri alma (rewind)** | Yok | Sola kaydırılanları tekrar görme yok. |
| **Reklam** | Yok | Uygulamada reklam yok; “reklamsız” ayrıca eklenebilir. |
| **Gizlilik (yaş/bilgi gizleme)** | Yok | Profilde “yaşımı gizle” vb. yok. |
| **Kredi paketleri** | Var | Paketler ve fake-payment ile kredi ekleme var. |

---

## 3. Eksikler ve Öncelik Sırası (Jaumo’ya Göre)

Aşağıdaki liste, Jaumo mantığına yaklaşmak için **eksik veya zayıf** olanları ve önerilen **öncelik** sırasını verir.

### Yüksek öncelik (premium değeri doğrudan artar)

1. **Ziyaretçileri premium’a kilitleme**  
   - **Eksik:** Şu an herkes tüm ziyaretçi listesini görüyor.  
   - **Hedef:** Ücretsiz kullanıcı: son 3–5 ziyaretçi veya “X kişi profilinizi görüntüledi” + blur/kilitle. Premium: tam liste.  
   - **Yer:** Beğeniler ekranı – Ziyaretçiler sekmesi + store metni (“Profilinizi kim gördü”).

2. **Gelişmiş filtreleri premium’a kilitleme**  
   - **Eksik:** Tüm filtreler herkese açık.  
   - **Hedef:** Temel filtreler (cinsiyet, yaş, mesafe) ücretsiz; gelişmiş (vücut tipi, din, alkol, çocuk, ilişki durumu, dil vb.) sadece premium.  
   - **Yer:** Keşfet – FilterModal + backend filtre mantığı.

3. **Keşfet sıralamasında premium boost**  
   - **Eksik:** “Öne çıkan profil” metni var, mantık yok.  
   - **Hedef:** Premium kullanıcılar keşfet sonuçlarında daha üst sırada (ör. `ORDER BY is_premium DESC, last_seen DESC` veya benzeri).  
   - **Yer:** Keşfet `fetchUsers` + `profiles` veya bir “featured” alanı.

### Orta öncelik (deneyim ve gelir)

4. **Günlük beğeni limiti (ücretsiz)**  
   - **Eksik:** Günlük beğeni sınırı yok.  
   - **Hedef:** Ücretsiz: örn. günde 20–30 beğeni; premium: sınırsız.  
   - **Yer:** Keşfet `handleLike` + `likes` tablosu veya günlük sayaç (DB/Edge Function).

5. **Okundu bilgisini premium’a kilitleme**  
   - **Eksik:** Herkes “okundu” görüyor.  
   - **Hedef:** Sadece premium “mesajım okundu mu” görsün; ücretsizde gri/“—” veya “Premium ile gör” tooltip.  
   - **Yer:** Sohbet ekranı – okundu göstergesi + `isPremium`.

6. **Geri alma (rewind)**  
   - **Eksik:** Sola kaydırılanları tekrar görme yok.  
   - **Hedef:** Son sola kaydırılan 1–3 kişiyi “Geri al” ile tekrar gösterme; ücretsizde 1x/gün veya sadece premium.  
   - **Yer:** Keşfet state veya `swipe_actions` / `explore_skipped` tablosu + UI.

### Düşük öncelik (nice-to-have)

7. **Gizlilik seçenekleri (yaş/bilgi gizleme)**  
   - Profilde “Yaşımı gizle”, “Mesafemi gizle” gibi alanlar; sadece premium’da veya ücretsizde 1 seçenek.

8. **Profil boost (süreli öne çıkarma)**  
   - Jaumo’daki “boost” gibi: 30 dk / 1 saat süreyle keşfet’te en üstte. Ayrı ücret veya premium paketine dahil edilebilir.

9. **Reklam (ileride)**  
   - Ücretsiz kullanıcıya banner/ödüllü reklam; premium’da “reklamsız” vurgusu.

10. **Abonelik süresi (subscription_end)**  
    - `subscriptions.subscription_start` / `subscription_end` zaten şema’da var; ödeme entegrasyonunda süre bazlı açma/kapama eklenmeli.

---

## 4. Önerilen Çalışma Planı (Sırayla)

### Faz 1: Premium değerini netleştir (1–2 hafta)

| # | Görev | Açıklama |
|---|--------|----------|
| 1.1 | Ziyaretçi listesini premium’a kilitle | Ücretsiz: son N ziyaretçi veya “X kişi gördü” + “Tam listeyi görmek için Premium”. Premium: tam liste. |
| 1.2 | Gelişmiş filtreleri premium yap | FilterModal’da “Bu filtre Premium üyeler içindir” + store’a yönlendirme. Backend’de premium kontrolü. |
| 1.3 | Keşfet sıralamasında premium boost | fetchUsers’da premium kullanıcıları öne al (veya featured flag). |

### Faz 2: Limitler ve okundu (1 hafta)

| # | Görev | Açıklama |
|---|--------|----------|
| 2.1 | Ücretsiz günlük beğeni limiti | Örn. 20/gün; `likes` veya ayrı sayaç; limit dolunca “Premium ile sınırsız beğen” CTA. |
| 2.2 | Okundu bilgisini premium’a kilitle | Sohbet ekranında okundu göstergesini sadece premium’da göster; ücretsizde placeholder. |

### Faz 3: Rewind ve ekstra (1+ hafta)

| # | Görev | Açıklama |
|---|--------|----------|
| 3.1 | Rewind (son kaydırmaları geri al) | Son 1–3 sola kaydırılanı sakla; “Geri al” butonu (ücretsiz 1x/gün veya sadece premium). |
| 3.2 | Abonelik bitiş tarihi | Ödeme entegrasyonunda `subscription_end` set et; süre bitince `is_premium = false`. |
| 3.3 | Gizlilik: yaş/bilgi gizleme (isteğe bağlı) | Profil ayarları + “Sadece Premium” etiketi. |

---

## 5. Teknik Notlar

- **Premium kontrolü:** Tüm ekranlarda `subscriptions.is_premium` kullanılıyor; merkezi bir `useSubscription()` veya AuthContext’e `isPremium` eklenebilir (tek yerden okuma).
- **Filtre kilidi:** FilterModal’da filtre seçiminde `isPremium` kontrolü; backend’de (veya Edge Function’da) premium olmayan için gelişmiş filtreleri yok say veya hata dön.
- **Ziyaretçi:** `profile_views` sorgusunda limit (örn. 5) + ücretsiz kullanıcıya “X kişi sizi gördü – tam listeyi Premium ile görün” mesajı.
- **Boost:** `profiles` ile join için `subscriptions.is_premium` veya `profiles.featured_until`; sıralama: `ORDER BY (premium/featured), last_seen DESC`.

Bu doküman, Jaumo tarzı premium mantığına göre **eksikleri** ve **uygulama sırasını** tanımlar; geliştirme sırasında bu maddeler tek tek alınabilir.
