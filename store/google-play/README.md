# Google Play Console — görseller

Üretim komutu:

```bash
npm run generate:play-assets
```

## Dosyalar ve Play Console eşlemesi

| Dosya | İçerik |
|--------|--------|
| `feature-graphic-1024x500.png` | Mağaza girişi → **Grafik özelliği** (1024×500). Premium şeridi + logo. |
| `play-store-icon-512.png` | **512×512** yüksek çözünürlüklü simge |
| `phone-screenshot-01-login.png` | Giriş ekranı (e-posta, Google, Premium notu) |
| `phone-screenshot-02-kesfet.png` | Keşfet: arama, **Premium** filtresi, profil kartları, **Öne çıkan** |
| `phone-screenshot-03-mesajlar.png` | Mesaj listesi + **Premium** bilgi şeridi |
| `phone-screenshot-04-begenilenler.png` | Beğenilenler: bulanık profil, **Premium** rozeti, **Premium’a geç** |
| `phone-screenshot-05-ayarlar.png` | Ayarlar: **Premium mağaza** altın vurgulu satır |

Görseller `scripts/generate-google-play-assets.mjs` ile oluşturulur (marka renkleri + logo). Yayına almadan önce gerçek uygulama ekran görüntüleriyle değiştirmen önerilir.

## Boyutlar

- Öne çıkan grafik: **1024 × 500** px  
- Telefon: **1080 × 1920** px (dikey)
