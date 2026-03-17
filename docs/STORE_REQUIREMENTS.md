# Mağaza Gereksinimleri (App Store / Google Play)

## Uygulama kimliği
- **Ad:** Kendi uygulama adınız (örn. "Sohbet & Eşleşme").
- **Paket / Bundle ID:** Mağaza hesabında tanımlı benzersiz kimlik.

## Görseller (kendi cümleleriniz ve görsellerinizle)
- **App icon:** 1024x1024 px (iOS), Android için gerekli tüm boyutlar. `app.json` → `expo.icon` veya `./assets/images/icon.png`.
- **Splash / açılış ekranı:** Logo ve uygulama adı; `app.json` → `expo.splash` (image, backgroundColor, resizeMode).
- **Ekran görüntüleri:** En az 2–5 adet; telefon ve gerekirse tablet. Keşfet, sohbet, profil, mağaza ekranlarından örnekler.

## Metinler (kendi cümlelerinizle)
- **Kısa açıklama (alt başlık / kısa tanıtım):**  
  Örnek: "Yakınınızdaki kişilerle eşleşin, güvenli sohbet edin."
- **Uzun açıklama:**  
  Özellikler (eşleşme, filtreler, mesajlaşma, Premium/Kredi), güvenlik (engelleme, şikâyet), 18+ uyarısı, iletişim (destek e-posta).

## Yaş ve içerik
- **Yaş sınırı:** 18+ (dating/sohbet uygulaması).
- **İçerik politikaları:**
  - Kullanım şartları ve gizlilik politikası uygulama içinde (Ayarlar → Yasal) ve mağaza sayfasında linklenmeli.
  - Kullanıcılar taciz, nefret söylemi, spam veya uygunsuz içerik paylaşmamalı; ihlal durumunda hesap kısıtlanır veya sonlandırılır.
  - Kullanıcılar engelleme ve şikâyet araçlarına sahiptir; şikâyetler incelenir.

## Teknik
- **expo-notifications:** Push bildirimleri için eklendi; production’da EAS projectId ile Expo Push Token alınır.
- **Splash:** `app.json` içinde `expo.splash` ile yapılandırılır; görsel `./assets/images/splash.png` (veya benzeri) kullanılabilir.
