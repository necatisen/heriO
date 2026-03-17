# Mesajlar ve Beğeniler – Jaumo Tarzı Plan

## Jaumo Özeti (Araştırma)
- **Mesajlar:** Sohbet merkezde; eşleşenlerle sınırsız mesaj. Liste: son mesaj önizlemesi, saat, okunmamış rozeti.
- **Beğeniler / Eşleşme:** Zapping (kaydırma) ile beğen/geç. “Who liked me” (Beğenenler) ve benzeri sekme. Karşılıklı beğeni = eşleşme, sohbet açılır.
- **Ziyaretçiler:** Profilini görüntüleyenler ayrı sekmede (bazı özellikler premium).

---

## 1. Mesajlar Alanı – Yapılacaklar

| Madde | Açıklama |
|-------|----------|
| **Liste görünümü** | Her sohbet: avatar, isim, son mesaj metni (veya “📷 Fotoğraf”), saat (göreli: “2 dk”, “Dün”), okunmamış sayısı. |
| **Sekmeler (opsiyonel)** | “Tümü” / “Okunmamış” gibi filtre. |
| **Resim yükleme** | Profil resmi yükleme mantığıyla aynı: avatars bucket veya aynı hızlı akış (base64/URI → tek istek, public URL). Chat-media yerine aynı bucket/akış kullanılabilir. |
| **Mesaj metni** | Yazılan cümle aynen sohbette görünsün; uzun cümlede “devamının alt satıra kaymaması” için tek satır + yatay kaydırma veya balonun tek satırda genişlemesi. |
| **Bildirim** | Yeni mesaj için push/in-app bildirim (mevcut yapıyla entegre). |

---

## 2. Beğeniler Alanı – Yapılacaklar

| Madde | Açıklama |
|-------|----------|
| **Beğenenler** | Beni beğenen kullanıcılar listesi (zaten var). Beğenilen kişiye bildirim: “X sizi beğendi”; oturum kapalıyken açıldığında bu metin gösterilsin (push veya giriş sonrası in-app). |
| **Beğendiklerim** | Benim beğendiğim liste (zaten var). |
| **Ziyaretçiler** | Profilimi (keşfette) görüntüleyenler; profil görüntüleme kaydı (profile_views) + Ziyaretçiler sekmesinde listeleme. |
| **Eşleşme** | Karşılıklı beğenide “Eşleştiniz” modal + sohbet açılır (zaten var). |
| **Bildirim içeriği** | Beğeni bildiriminde “X kişisi sizi beğendi” için actor adı (data veya profil sorgusu) kullanılsın. |

---

## 3. Keşfet – Bağlantılar

| Madde | Açıklama |
|-------|----------|
| **Beğen** | Beğenince `likes` insert + hedef kullanıcıya `notifications` (type: like, actor bilgisi). Oturum kapalıysa: giriş sonrası “X sizi beğendi” (in-app veya push). |
| **Profil görüntüleme** | Kart/profil açıldığında `profile_views` insert (viewer_id = ben, viewed_user_id = görüntülenen). Ziyaretçiler sekmesi bu kayıtlara göre listeler. |

---

## 4. Öncelik Sırası (Uygulama)

1. Mesajlarda resim yükleme: profil (avatars) ile aynı mantık/hız.
2. Mesaj metni: yazılan cümle aynen görünsün; alt satıra kaymayı engelle (tek satır / yatay kaydırma).
3. Beğeni bildirimi: like insert sonrası notification + “X sizi beğendi” giriş sonrası gösterimi.
4. Ziyaretçiler: keşfette profil görüntülenince profile_views + Ziyaretçiler’de listeleme (mevcut kontrol).

Bu plan dokümanı; istenen detaylar aşağıdaki uygulama adımlarıyla hayata geçirilecek.

---

## Uygulanan Detaylar (Özet)

- **Mesajlarda resim:** Profil yükleme ile aynı mantık kullanıldı (`uploadChatImage` artık `avatars` bucket + `uploadAvatarUri` ile public URL; daha hızlı).
- **Mesaj metni:** Cümlenin alt satıra kaymaması için mesaj metni yatay `ScrollView` içinde tek satırda gösteriliyor; uzun metinler kaydırılarak okunuyor.
- **Beğeni bildirimi:** Keşfet’te beğenince `notifications` kaydına `data.actor_name` eklendi. Beğeniler ekranında Beğenenler sekmesinde okunmamış like bildirimleri “X sizi beğendi” / “X kişisi sizi beğendi” banner’ı ile gösteriliyor; tıklanınca okundu işaretleniyor.
- **Ziyaretçiler:** Keşfet’te bir profili açınca `ProfileModal` zaten `profile_views` insert ediyor (viewer_id = giriş yapan, viewed_user_id = görüntülenen). Ziyaretçiler sekmesi bu kayıtlara göre listeyi dolduruyor.
