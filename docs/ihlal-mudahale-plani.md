# Birthchat – Kişisel Veri İhlali Müdahale Planı

> İç belge. KVKK m. 12/5 ve Kurul'un 2019/10 sayılı kararı esas alınmıştır. Hukuki tavsiye değildir; avukat kontrolünden geçirilmelidir.

**Veri sorumlusu:** Necati Şen · **İletişim:** birthchathelp@gmail.com
**Süre kuralı:** İhlal **öğrenildiği andan itibaren en geç 72 saat** içinde Kişisel Verileri Koruma Kurulu'na bildirilir. Etkilenen kişilere, kimlikleri belirlendikten sonra **makul en kısa sürede** bildirim yapılır.

---

## 1. Tespit (0. saat)
Olası ihlal belirtileri:
- Supabase'de beklenmeyen sorgular, toplu veri okumaları, yeni API anahtarı kullanımı.
- Kullanıcıdan "hesabıma başkası girdi / verilerim yayınlandı" bildirimi.
- GitHub'da gizli bilgi (anahtar, şifre) yayınlanması.
- Supabase, Google veya Expo'dan güvenlik bildirimi.

**Yapılacak:** Saati not et → aşağıdaki **İhlal Kayıt Formu**nu aç.

## 2. Sınırlama (ilk 1–4 saat)
1. Sızdığı düşünülen anahtarları **hemen yenile**:
   - Supabase → Project Settings → API → `service_role` ve JWT secret.
   - Supabase veritabanı şifresi.
   - Vault'taki `message_encryption_key` (mesaj şifreleme anahtarı) ele geçirildiyse yenileme planı hazırla.
   - Google OAuth client secret, Expo erişim anahtarı, imza anahtarı şifreleri.
2. Gerekirse riskli özelliği kapat: `app_config` ile zorunlu güncelleme (`android_min_version_code`) veya ilgili Edge Function'ı geçici olarak devre dışı bırak.
3. Şüpheli hesapları askıya al.
4. Kayıtları (Supabase logları, ekran görüntüleri) **silmeden** sakla.

## 3. Değerlendirme (ilk 24 saat)
- Hangi veriler etkilendi? (kimlik, e-posta, profil, mesaj, fotoğraf, **özel nitelikli**: din / biyometrik)
- Kaç kişi etkilendi? Hangi ülkelerden?
- Veriler şifreli miydi? (Mesaj metinleri AES-256 ile şifreli; selfie'ler saklanmıyor.)
- Kişiler için olası sonuçlar (dolandırıcılık, itibar kaybı, ifşa).

## 4. Kurul'a bildirim (en geç 72. saat)
- https://www.kvkk.gov.tr → **Veri İhlali Bildirimi** formu (e-Devlet / KEP ya da posta).
- Bilgilerin tamamı 72 saatte netleşmezse, eldeki bilgilerle bildir; eksikleri sonradan tamamla. Gecikme varsa nedenini yaz.

## 5. Kişilere bildirim
- Uygulama içi bildirim + e-posta (aşağıdaki şablon).
- İçerik: ne oldu, ne zaman, hangi veriler, olası sonuçlar, alınan önlemler, kullanıcının yapması gerekenler, iletişim adresi.

## 6. Kapanış (1–2 hafta)
- Kök neden analizi, kalıcı düzeltme, e2e testine yeni güvenlik adımı.
- İhlal Kayıt Formu'nu dosyala (**en az 5 yıl** saklanır, ihlal kişiyi etkilemese bile).

---

## İhlal Kayıt Formu

| Alan | Bilgi |
|---|---|
| İhlalin öğrenildiği tarih/saat | |
| İhlalin gerçekleştiği tarih/saat (tahmini) | |
| Nasıl fark edildi | |
| Etkilenen veri kategorileri | |
| Etkilenen kişi sayısı (tahmini) | |
| Özel nitelikli veri var mı | Evet / Hayır |
| Veriler şifreli miydi | |
| Alınan sınırlama önlemleri | |
| Kurul'a bildirim tarihi / numarası | |
| Kişilere bildirim tarihi ve yöntemi | |
| Kök neden ve kalıcı çözüm | |

---

## Kullanıcı bildirim şablonu

**TR**
> Konu: Birthchat – Güvenlik bildirimi
>
> Merhaba, [TARİH] tarihinde Birthchat sistemlerinde [KISA AÇIKLAMA] tespit ettik. Bu olaydan [ETKİLENEN VERİLER] etkilenmiş olabilir. Şifreleriniz [ETKİLENDİ / ETKİLENMEDİ]. Durumu fark eder etmez [ALINAN ÖNLEMLER]. Önlem olarak şifrenizi değiştirmenizi ve şüpheli mesajlara karşı dikkatli olmanızı öneririz. Sorularınız için: birthchathelp@gmail.com

**EN**
> Subject: Birthchat – Security notice
>
> Hello, on [DATE] we detected [SHORT DESCRIPTION] in Birthchat systems. This may have affected [AFFECTED DATA]. Your password was [AFFECTED / NOT AFFECTED]. As soon as we noticed, we [MEASURES TAKEN]. As a precaution we recommend changing your password and being careful with suspicious messages. Questions: birthchathelp@gmail.com
