# Birthchat — Google Play Console rehberi

Bu klasördeki her şey Play Console'a doğrudan yüklenebilir.

| Dosya / klasör | Play Console'da nereye |
|---|---|
| `play-store-icon-512.png` | Mağazada bulunma → Ana mağaza girişi → **Uygulama simgesi** (512×512) |
| `feature-graphic-1024x500.png` | Ana mağaza girişi → **Öne çıkan grafik** |
| `screenshots/phone/<dil>/` | **Telefon ekran görüntüleri** (1080×1920, 7 adet) |
| `screenshots/tablet7/<dil>/` | **7 inç tablet ekran görüntüleri** (1200×1920) |
| `screenshots/tablet10/<dil>/` | **10 inç tablet ekran görüntüleri** (1600×2560) |
| `listing.json` | Uygulama adı, kısa açıklama, tam açıklama — 7 dil |

Dil kodları: `tr` Türkçe · `en` İngilizce (ABD) · `de` Almanca · `fr` Fransızca · `es` İspanyolca (İspanya) · `ru` Rusça · `ar` Arapça.

Ekran görüntüleri uygulamanın **gerçek arayüzünden** alınır (örnek hesaplar, çizim avatarlar — DiceBear "notionists", CC0).
Yeniden üretmek için: ham görüntüler → `node scripts/generate-store-screenshots.cjs <ham-klasör>`.
İkon ve öne çıkan grafik: `node scripts/generate-brand-assets.mjs`.

---

## 1. Uygulamayı oluştur

Play Console → **Uygulama oluştur**
- Uygulama adı: **Birthchat**
- Varsayılan dil: **Türkçe – tr-TR** (veya İngilizce – en-US)
- Uygulama / Oyun: **Uygulama** · Ücretsiz / Ücretli: **Ücretsiz**
- Beyanları işaretle → Oluştur.

Paket adı ilk AAB yüklendiğinde kesinleşir: **com.necatisen.birthchat**.

## 2. Uygulama içeriği (Politika → Uygulama içeriği)

| Bölüm | Yanıt |
|---|---|
| **Gizlilik politikası** | `https://necatisen.github.io/birthchat/privacy-policy` |
| **Uygulama erişimi** | "Tüm işlevler özel erişim gerektiriyor" → inceleme için test hesabı bilgisi ver (bkz. aşağı) |
| **Reklamlar** | Hayır, uygulamada reklam yok |
| **İçerik derecelendirmesi** | Anketi doldur (bkz. madde 3) |
| **Hedef kitle ve içerik** | Yalnızca **18 ve üzeri** · Çocuklara hitap etmiyor |
| **Veri güvenliği** | Bkz. madde 4 |
| **Devlet uygulaması / Finansal / Sağlık** | Hayır |
| **Haber uygulaması** | Hayır |
| **Hesap silme** | Uygulama içi: Profil → Ayarlar → Hesabı Sil · Web: `https://necatisen.github.io/birthchat/delete-account` |

**Uygulama erişimi için inceleme hesabı:** Play inceleme ekibi giriş yapabilmeli. Uygulamada kendine ait bir test hesabı oluştur (ör. `review@…`), e-posta ve şifreyi bu bölüme yaz. Yüz doğrulamanın kamera ile yapıldığını, isteğe bağlı olduğunu not et.

## 3. İçerik derecelendirmesi anketi (IARC)

- Kategori: **Sosyal ağ / iletişim** (Social or communication)
- Kullanıcılar birbiriyle etkileşim kuruyor / içerik paylaşıyor: **Evet**
- Kullanıcı konumu paylaşılıyor: **Hayır** (yalnızca yaklaşık mesafe gösteriliyor, kesin konum paylaşılmıyor)
- Dijital ürün satın alımı: **Evet** (Premium / kredi)
- Şiddet, cinsellik, kumar, uyuşturucu içeriği: **Hayır** (uygunsuz içerik kurallarla yasak, şikâyet + engelleme var)
- Sonuç genellikle **PEGI 12–16 / "Users Interact"** çıkar; hedef kitle 18+ olarak ayrıca belirtilir.

## 4. Veri güvenliği formu

Genel: Veriler aktarım sırasında **şifreleniyor: Evet** · Kullanıcı verilerinin silinmesini **isteyebilir: Evet** · Veriler satılmıyor, reklam için paylaşılmıyor.

| Veri türü | Toplanıyor | Paylaşılıyor | Amaç | Zorunlu mu |
|---|---|---|---|---|
| Ad | Evet | Hayır | Uygulama işlevi, hesap yönetimi | Zorunlu |
| E-posta adresi | Evet | Hayır | Hesap yönetimi | Zorunlu |
| Kullanıcı kimlikleri | Evet | Hayır | Hesap yönetimi | Zorunlu |
| Yaklaşık konum | Evet | Hayır | Uygulama işlevi (yakındaki kişiler) | İsteğe bağlı |
| Cinsel yönelim / din gibi hassas bilgiler | Evet (din, ilişki hedefi) | Hayır | Uygulama işlevi (eşleşme) | İsteğe bağlı |
| Diğer kişisel bilgiler (doğum tarihi, cinsiyet, boy vb.) | Evet | Hayır | Uygulama işlevi | Doğum tarihi/cinsiyet zorunlu |
| Fotoğraflar | Evet | Hayır | Uygulama işlevi, dolandırıcılık önleme | Profil fotoğrafı zorunlu |
| Mesajlar (uygulama içi) | Evet | Hayır | Uygulama işlevi | — |
| Biyometrik veri (yüz doğrulama görüntüleri) | Evet | Hayır | Dolandırıcılık önleme, güvenlik | İsteğe bağlı |
| Uygulama etkileşimleri (beğeni, ziyaret) | Evet | Hayır | Uygulama işlevi | — |
| Çökme / hata kayıtları | Evet (cihazda) | Hayır | Analiz | — |
| Cihaz kimlikleri (push token) | Evet | Hayır | Uygulama işlevi (bildirim) | — |
| Satın alma geçmişi | Evet | Hayır | Uygulama işlevi | — |

Not: Veriler Supabase (AB / Frankfurt) üzerinde işlenir; bu bir "hizmet sağlayıcı" olduğu için Play'in tanımına göre **paylaşım sayılmaz**.

## 5. Mağaza girişi

Mağazada bulunma → **Ana mağaza girişi**
- Metinler: `listing.json` → `tr` (varsayılan dil). Diğer diller için **Çeviriler → Kendi çevirilerimi ekle** ile `en`, `de`, `fr`, `es`, `ru`, `ar` bloklarını yapıştır.
- Grafikler: simge, öne çıkan grafik, her dil için telefon + 7" + 10" tablet ekran görüntüleri.
- Kategori: **Tanışma (Dating)** · İletişim e-postası: `birthchathelp@gmail.com`
- Gizlilik politikası URL'si yukarıdakiyle aynı.

## 6. Sürüm

1. **Test ve yayınla → Test etme → Dahili test → Yeni sürüm oluştur**
2. AAB'yi yükle (`release/birthchat-v1.0.0-1.aab`), sürüm notunu yaz → Kaydet → Yayınla.
3. Test kullanıcıları listesine kendini ekle, katılım bağlantısıyla telefona kur ve dene.
4. Yeni kişisel geliştirici hesaplarında üretime geçmeden önce **kapalı test** zorunludur: en az **12 test kullanıcısı**, **14 gün** boyunca kapalı testte kalmalı. Sonra **Üretim → Yeni sürüm**.

## 7. Yayından önce yapılması gerekenler

- [ ] Supabase → Authentication → Sign In / Providers → **Email → "Confirm email" kapat** (veya kendi SMTP'ni tanımla). Yeni projede açık geliyor; kapalı değilse kayıt olanlar giriş yapamaz.
- [ ] Supabase → Authentication → Providers → **Google**: Client ID / Secret gir; URL Configuration → Redirect URLs'e `birthchat://**` ekle.
- [ ] Gerçek ödeme: `app/store/fake-payment.tsx` test ekranıdır. Üretimden önce Google Play Billing eklenmeli; aksi halde Play "yanıltıcı ödeme" gerekçesiyle reddedebilir. Premium/kredi satışını şimdilik kapatmak da bir seçenek.
- [ ] Yüz doğrulama onayı: otomatik eşleştirme için Azure Face / AWS Rekognition anahtarı ya da yönetici onay ekranı.
