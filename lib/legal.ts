/**
 * Birthchat legal texts (in-app). The same content is published for Google Play at
 * docs/privacy-policy.md, docs/terms.md and docs/delete-account.md (GitHub Pages).
 * Last updated: 16 November 2026.
 */
import type { Language } from '@/lib/i18n';

export const SUPPORT_EMAIL = 'birthchathelp@gmail.com';
const UPDATED = '16.11.2026';

export const PRIVACY: Record<Language, string> = {
  tr: `Birthchat Gizlilik Politikası
Son güncelleme: ${UPDATED}

1. Kapsam
Bu politika, Birthchat mobil uygulamasını kullandığınızda kişisel verilerinizin nasıl işlendiğini açıklar. Birthchat yalnızca 18 yaş ve üzeri kullanıcılar içindir.

2. Topladığımız veriler
• Hesap: e-posta adresi ve şifre (şifre şifrelenmiş olarak saklanır), Google ile girişte Google hesap bilgileriniz.
• Profil: ad, kullanıcı adı, doğum tarihi, cinsiyet, boy, kilo, ülke/şehir, eğitim, meslek, alışkanlıklar, din ve ilişki hedefi gibi sizin girdiğiniz bilgiler, biyografi ve fotoğraflar.
• Konum: izin verirseniz, yakındaki kişileri göstermek için yaklaşık konumunuz.
• İletişim: mesajlar, mesajlarda paylaştığınız fotoğraflar, beğeniler, eşleşmeler, profil ziyaretleri, engelleme ve şikâyet kayıtları.
• Yüz doğrulama: selfie ve canlılık adımlarında çekilen kareler. Yüz algılama telefonunuzda (Google ML Kit) yapılır; görüntüler doğrulama incelemesi için gizli bir alanda saklanır ve profilinizde gösterilmez.
• Cihaz: bildirim gönderebilmek için bildirim anahtarı (push token), dil tercihi ve uygulama hata kayıtları.

3. Verileri neden kullanıyoruz
Hesabınızı oluşturmak ve yönetmek, sizi diğer kullanıcılarla eşleştirmek, mesajlaşmayı sağlamak, sahte profilleri ve kötüye kullanımı önlemek, uygunsuz içeriği denetlemek, bildirim göndermek ve uygulamayı geliştirmek için. Verilerinizi satmıyoruz ve reklam amacıyla paylaşmıyoruz.

4. Hukuki dayanak
Hizmet sözleşmesinin ifası, açık rızanız (konum, yüz doğrulama, hassas profil bilgileri) ve güvenliği sağlamaya yönelik meşru menfaatimiz (KVKK ve GDPR kapsamında).

5. Hizmet sağlayıcılar
Veriler Supabase altyapısında, Avrupa Birliği'nde (Frankfurt) barındırılır. Bildirimler Expo push hizmeti, Google ile giriş Google tarafından, görsel denetimi (etkinse) Sightengine tarafından işlenir. Bu sağlayıcılar verileri yalnızca hizmeti sunmak için kullanır.

6. Diğer kullanıcılar ne görür
Profil bilgileriniz, fotoğraflarınız, çevrimiçi durumunuz ve doğrulama rozetiniz diğer kullanıcılara gösterilir. Mesajlarınızı yalnızca sohbet ettiğiniz kişi görür. E-posta adresiniz ve yüz doğrulama görüntüleriniz gösterilmez.

7. Saklama ve silme
Verileriniz hesabınız açık olduğu sürece saklanır. Hesabınızı istediğiniz zaman Ayarlar > Hesabı Sil bölümünden silebilirsiniz; profiliniz, fotoğraflarınız, mesajlarınız ve doğrulama kayıtlarınız silinir. Yedeklerden silinmesi en geç 30 gün sürer. Uygulamaya erişemiyorsanız ${SUPPORT_EMAIL} adresine yazabilirsiniz.

8. Haklarınız
Verilerinize erişme, düzeltme, silme, işlemeye itiraz etme, rızanızı geri alma ve veri taşınabilirliği haklarınız vardır. Talepleriniz için ${SUPPORT_EMAIL}.

9. Güvenlik
Bağlantılar şifrelidir, veritabanı erişimi satır düzeyinde güvenlik kurallarıyla sınırlandırılmıştır.

10. Çocuklar
Birthchat 18 yaşından küçükler için değildir. Böyle bir hesap fark edildiğinde silinir.

11. Değişiklikler ve iletişim
Bu politikayı güncelleyebiliriz; önemli değişiklikleri uygulama içinde duyururuz. İletişim: ${SUPPORT_EMAIL}`,

  en: `Birthchat Privacy Policy
Last updated: ${UPDATED}

1. Scope
This policy explains how your personal data is processed when you use the Birthchat mobile app. Birthchat is only for users aged 18 and over.

2. Data we collect
• Account: email address and password (stored encrypted); your Google account details if you sign in with Google.
• Profile: information you enter such as name, username, date of birth, gender, height, weight, country/city, education, profession, habits, religion and relationship goal, plus your bio and photos.
• Location: if you allow it, your approximate location to show people nearby.
• Communication: messages, photos you share in chats, likes, matches, profile visits, blocks and reports.
• Face verification: your selfie and the frames captured during the liveness steps. Face detection runs on your phone (Google ML Kit); the images are stored in a private area for verification review and are never shown on your profile.
• Device: push notification token, language preference and app error logs.

3. How we use data
To create and manage your account, match you with other users, enable messaging, prevent fake profiles and abuse, moderate inappropriate content, send notifications and improve the app. We do not sell your data or share it for advertising.

4. Legal basis
Performance of our service contract, your consent (location, face verification, sensitive profile details) and our legitimate interest in keeping the service safe (GDPR / KVKK).

5. Service providers
Data is hosted on Supabase in the European Union (Frankfurt). Notifications are delivered via the Expo push service, Google sign-in is handled by Google and image moderation (when enabled) by Sightengine. These providers only use data to provide their service.

6. What other users see
Your profile information, photos, online status and verification badge are visible to other users. Your messages are only visible to the person you chat with. Your email address and face verification images are never shown.

7. Retention and deletion
We keep your data while your account is open. You can delete your account at any time in Settings > Delete Account; your profile, photos, messages and verification records are deleted. Removal from backups takes up to 30 days. If you cannot access the app, email ${SUPPORT_EMAIL}.

8. Your rights
You have the right to access, correct and delete your data, to object to processing, to withdraw consent and to data portability. Contact ${SUPPORT_EMAIL}.

9. Security
Connections are encrypted and database access is restricted by row-level security rules.

10. Children
Birthchat is not intended for anyone under 18. Such accounts are deleted when identified.

11. Changes and contact
We may update this policy and will announce important changes in the app. Contact: ${SUPPORT_EMAIL}`,

  de: `Birthchat Datenschutzerklärung
Zuletzt aktualisiert: ${UPDATED}

1. Geltungsbereich
Diese Erklärung beschreibt, wie deine personenbezogenen Daten bei der Nutzung der Birthchat-App verarbeitet werden. Birthchat ist nur für Personen ab 18 Jahren.

2. Welche Daten wir erheben
• Konto: E-Mail-Adresse und Passwort (verschlüsselt gespeichert); bei Google-Anmeldung deine Google-Kontodaten.
• Profil: von dir eingegebene Angaben wie Name, Benutzername, Geburtsdatum, Geschlecht, Größe, Gewicht, Land/Stadt, Bildung, Beruf, Gewohnheiten, Religion und Beziehungsziel sowie Bio und Fotos.
• Standort: mit deiner Erlaubnis dein ungefährer Standort, um Personen in der Nähe anzuzeigen.
• Kommunikation: Nachrichten, in Chats geteilte Fotos, Likes, Matches, Profilbesuche, Blockierungen und Meldungen.
• Gesichtsverifizierung: dein Selfie und die Bilder der Lebendigkeitsschritte. Die Gesichtserkennung läuft auf deinem Handy (Google ML Kit); die Bilder werden zur Prüfung in einem privaten Bereich gespeichert und nie im Profil gezeigt.
• Gerät: Push-Token, Spracheinstellung und Fehlerprotokolle der App.

3. Zwecke
Konto erstellen und verwalten, Matches vorschlagen, Nachrichten ermöglichen, Fake-Profile und Missbrauch verhindern, unangemessene Inhalte moderieren, Benachrichtigungen senden und die App verbessern. Wir verkaufen deine Daten nicht und geben sie nicht für Werbung weiter.

4. Rechtsgrundlagen
Vertragserfüllung, deine Einwilligung (Standort, Gesichtsverifizierung, sensible Profilangaben) und unser berechtigtes Interesse an einem sicheren Dienst (DSGVO).

5. Dienstleister
Die Daten werden bei Supabase in der EU (Frankfurt) gehostet. Benachrichtigungen laufen über den Expo-Push-Dienst, die Google-Anmeldung über Google, die Bildmoderation (falls aktiv) über Sightengine. Diese Anbieter nutzen die Daten nur zur Erbringung ihres Dienstes.

6. Was andere sehen
Profilangaben, Fotos, Online-Status und Verifizierungsabzeichen sind für andere sichtbar. Nachrichten sieht nur dein Chatpartner. E-Mail-Adresse und Verifizierungsbilder werden nie angezeigt.

7. Speicherung und Löschung
Wir speichern deine Daten, solange dein Konto besteht. Du kannst dein Konto jederzeit unter Einstellungen > Konto löschen entfernen; Profil, Fotos, Nachrichten und Verifizierungsdaten werden gelöscht. Die Entfernung aus Backups dauert bis zu 30 Tage. Ohne App-Zugang: ${SUPPORT_EMAIL}.

8. Deine Rechte
Auskunft, Berichtigung, Löschung, Widerspruch, Widerruf der Einwilligung und Datenübertragbarkeit. Kontakt: ${SUPPORT_EMAIL}. Du kannst dich außerdem bei einer Datenschutzaufsichtsbehörde beschweren.

9. Sicherheit
Verbindungen sind verschlüsselt, der Datenbankzugriff ist durch Sicherheitsregeln auf Zeilenebene beschränkt.

10. Minderjährige
Birthchat richtet sich nicht an Personen unter 18. Solche Konten werden gelöscht.

11. Änderungen und Kontakt
Wir können diese Erklärung anpassen und kündigen wichtige Änderungen in der App an. Kontakt: ${SUPPORT_EMAIL}`,

  fr: `Politique de confidentialité de Birthchat
Dernière mise à jour : ${UPDATED}

1. Champ d'application
Cette politique explique comment vos données personnelles sont traitées lorsque vous utilisez l'application Birthchat. Birthchat est réservée aux personnes de 18 ans et plus.

2. Données collectées
• Compte : adresse e-mail et mot de passe (stocké chiffré) ; vos informations Google si vous vous connectez avec Google.
• Profil : informations que vous saisissez (nom, nom d'utilisateur, date de naissance, genre, taille, poids, pays/ville, études, profession, habitudes, religion, objectif de relation), votre bio et vos photos.
• Localisation : si vous l'autorisez, votre position approximative pour afficher les personnes proches.
• Communications : messages, photos partagées, likes, matchs, visites de profil, blocages et signalements.
• Vérification faciale : votre selfie et les images des étapes de détection de présence. La détection du visage se fait sur votre téléphone (Google ML Kit) ; les images sont conservées dans un espace privé pour l'examen et ne sont jamais affichées sur votre profil.
• Appareil : jeton de notification, langue et journaux d'erreurs de l'application.

3. Finalités
Créer et gérer votre compte, vous proposer des matchs, permettre la messagerie, empêcher les faux profils et les abus, modérer les contenus inappropriés, envoyer des notifications et améliorer l'application. Nous ne vendons pas vos données et ne les partageons pas à des fins publicitaires.

4. Bases légales
Exécution du contrat, votre consentement (localisation, vérification faciale, données sensibles) et notre intérêt légitime à assurer la sécurité du service (RGPD).

5. Prestataires
Les données sont hébergées chez Supabase dans l'Union européenne (Francfort). Les notifications passent par le service Expo Push, la connexion Google par Google et la modération d'images (si activée) par Sightengine.

6. Ce que voient les autres
Vos informations de profil, photos, statut en ligne et badge de vérification sont visibles. Vos messages ne sont visibles que par votre interlocuteur. Votre e-mail et vos images de vérification ne sont jamais affichés.

7. Conservation et suppression
Nous conservons vos données tant que votre compte existe. Vous pouvez supprimer votre compte à tout moment dans Paramètres > Supprimer le compte ; profil, photos, messages et données de vérification sont supprimés. La suppression des sauvegardes prend jusqu'à 30 jours. Sans accès à l'application : ${SUPPORT_EMAIL}.

8. Vos droits
Accès, rectification, effacement, opposition, retrait du consentement et portabilité. Contact : ${SUPPORT_EMAIL}. Vous pouvez aussi saisir l'autorité de protection des données.

9. Sécurité
Les connexions sont chiffrées et l'accès à la base de données est limité par des règles de sécurité au niveau des lignes.

10. Mineurs
Birthchat n'est pas destinée aux moins de 18 ans. Ces comptes sont supprimés.

11. Modifications et contact
Nous pouvons mettre à jour cette politique et annoncerons les changements importants dans l'application. Contact : ${SUPPORT_EMAIL}`,

  es: `Política de privacidad de Birthchat
Última actualización: ${UPDATED}

1. Alcance
Esta política explica cómo se tratan tus datos personales al usar la app Birthchat. Birthchat es solo para mayores de 18 años.

2. Datos que recogemos
• Cuenta: correo electrónico y contraseña (guardada cifrada); tus datos de Google si inicias sesión con Google.
• Perfil: datos que introduces como nombre, usuario, fecha de nacimiento, género, altura, peso, país/ciudad, estudios, profesión, hábitos, religión y objetivo de relación, además de tu biografía y fotos.
• Ubicación: si lo permites, tu ubicación aproximada para mostrar personas cercanas.
• Comunicaciones: mensajes, fotos compartidas, me gusta, matches, visitas al perfil, bloqueos y denuncias.
• Verificación facial: tu selfie y las imágenes de los pasos de prueba de vida. La detección facial se hace en tu móvil (Google ML Kit); las imágenes se guardan en un área privada para revisión y nunca se muestran en tu perfil.
• Dispositivo: token de notificaciones, idioma y registros de errores de la app.

3. Para qué los usamos
Crear y gestionar tu cuenta, proponerte matches, permitir la mensajería, evitar perfiles falsos y abusos, moderar contenido inapropiado, enviar notificaciones y mejorar la app. No vendemos tus datos ni los compartimos con fines publicitarios.

4. Base legal
Ejecución del contrato, tu consentimiento (ubicación, verificación facial, datos sensibles) y nuestro interés legítimo en la seguridad del servicio (RGPD).

5. Proveedores
Los datos se alojan en Supabase en la Unión Europea (Fráncfort). Las notificaciones usan el servicio Expo Push, el inicio con Google lo gestiona Google y la moderación de imágenes (si está activa) Sightengine.

6. Lo que ven los demás
Tu información de perfil, fotos, estado en línea e insignia de verificación son visibles. Tus mensajes solo los ve la persona con la que chateas. Tu correo y tus imágenes de verificación nunca se muestran.

7. Conservación y eliminación
Conservamos tus datos mientras tu cuenta exista. Puedes eliminarla cuando quieras en Ajustes > Eliminar cuenta; se borran tu perfil, fotos, mensajes y datos de verificación. La eliminación de las copias de seguridad tarda hasta 30 días. Si no puedes acceder a la app: ${SUPPORT_EMAIL}.

8. Tus derechos
Acceso, rectificación, supresión, oposición, retirada del consentimiento y portabilidad. Contacto: ${SUPPORT_EMAIL}. También puedes reclamar ante la autoridad de protección de datos.

9. Seguridad
Las conexiones están cifradas y el acceso a la base de datos está limitado por reglas de seguridad a nivel de fila.

10. Menores
Birthchat no está dirigida a menores de 18 años. Esas cuentas se eliminan.

11. Cambios y contacto
Podemos actualizar esta política y anunciaremos los cambios importantes en la app. Contacto: ${SUPPORT_EMAIL}`,

  ru: `Политика конфиденциальности Birthchat
Последнее обновление: ${UPDATED}

1. Область применения
Эта политика описывает, как обрабатываются ваши персональные данные при использовании приложения Birthchat. Birthchat предназначен только для лиц от 18 лет.

2. Какие данные мы собираем
• Аккаунт: адрес электронной почты и пароль (хранится в зашифрованном виде); данные Google при входе через Google.
• Профиль: введённые вами сведения — имя, имя пользователя, дата рождения, пол, рост, вес, страна/город, образование, профессия, привычки, религия и цель знакомства, а также описание и фотографии.
• Местоположение: с вашего разрешения — приблизительное местоположение, чтобы показывать людей рядом.
• Общение: сообщения, фото в чатах, лайки, совпадения, просмотры профиля, блокировки и жалобы.
• Проверка лица: селфи и кадры шагов проверки живости. Распознавание лица выполняется на телефоне (Google ML Kit); изображения хранятся в закрытом хранилище для проверки и никогда не показываются в профиле.
• Устройство: токен push-уведомлений, язык и журналы ошибок приложения.

3. Цели обработки
Создание и ведение аккаунта, подбор совпадений, обмен сообщениями, защита от фейковых профилей и злоупотреблений, модерация неприемлемого контента, уведомления и улучшение приложения. Мы не продаём ваши данные и не передаём их для рекламы.

4. Правовые основания
Исполнение договора, ваше согласие (местоположение, проверка лица, чувствительные данные профиля) и наш законный интерес в безопасности сервиса (GDPR).

5. Поставщики услуг
Данные размещаются в Supabase в Европейском союзе (Франкфурт). Уведомления доставляет сервис Expo Push, вход через Google обрабатывает Google, модерацию изображений (если включена) — Sightengine.

6. Что видят другие пользователи
Данные профиля, фото, статус «в сети» и значок проверки видны другим. Сообщения видит только ваш собеседник. Почта и изображения проверки никогда не показываются.

7. Хранение и удаление
Мы храним данные, пока существует ваш аккаунт. Удалить аккаунт можно в любой момент: Настройки > Удалить аккаунт; профиль, фото, сообщения и данные проверки удаляются. Удаление из резервных копий занимает до 30 дней. Если нет доступа к приложению: ${SUPPORT_EMAIL}.

8. Ваши права
Доступ, исправление, удаление, возражение против обработки, отзыв согласия и переносимость данных. Контакт: ${SUPPORT_EMAIL}.

9. Безопасность
Соединения шифруются, доступ к базе данных ограничен правилами безопасности на уровне строк.

10. Несовершеннолетние
Birthchat не предназначен для лиц младше 18 лет. Такие аккаунты удаляются.

11. Изменения и контакты
Мы можем обновлять политику и сообщим о важных изменениях в приложении. Контакт: ${SUPPORT_EMAIL}`,

  ar: `سياسة الخصوصية لتطبيق Birthchat
آخر تحديث: ${UPDATED}

1. النطاق
توضح هذه السياسة كيفية معالجة بياناتك الشخصية عند استخدام تطبيق Birthchat. التطبيق مخصص فقط لمن هم في سن 18 عامًا فأكثر.

2. البيانات التي نجمعها
• الحساب: البريد الإلكتروني وكلمة المرور (تُحفظ مشفّرة)؛ وبيانات حساب Google عند تسجيل الدخول عبره.
• الملف الشخصي: ما تدخله من اسم واسم مستخدم وتاريخ ميلاد وجنس وطول ووزن ودولة/مدينة وتعليم ومهنة وعادات ودين وهدف العلاقة، إضافة إلى النبذة والصور.
• الموقع: بإذنك، موقعك التقريبي لعرض الأشخاص القريبين.
• التواصل: الرسائل والصور المرسلة في المحادثات والإعجابات والتطابقات وزيارات الملف والحظر والبلاغات.
• توثيق الوجه: صورتك الذاتية واللقطات أثناء خطوات اختبار الحيوية. يتم اكتشاف الوجه على هاتفك (Google ML Kit)، وتُحفظ الصور في مساحة خاصة للمراجعة ولا تظهر أبدًا في ملفك.
• الجهاز: رمز الإشعارات واللغة وسجلات أخطاء التطبيق.

3. أغراض الاستخدام
إنشاء حسابك وإدارته، واقتراح التطابقات، وتمكين المراسلة، ومنع الحسابات المزيفة وإساءة الاستخدام، ومراقبة المحتوى غير اللائق، وإرسال الإشعارات، وتحسين التطبيق. لا نبيع بياناتك ولا نشاركها لأغراض إعلانية.

4. الأساس القانوني
تنفيذ عقد الخدمة، وموافقتك (الموقع، توثيق الوجه، البيانات الحساسة)، ومصلحتنا المشروعة في الحفاظ على أمان الخدمة.

5. مقدمو الخدمات
تُستضاف البيانات لدى Supabase في الاتحاد الأوروبي (فرانكفورت). تُرسل الإشعارات عبر خدمة Expo Push، ويتولى Google تسجيل الدخول عبر Google، وتتولى Sightengine مراقبة الصور (عند تفعيلها).

6. ما يراه الآخرون
معلومات ملفك وصورك وحالة الاتصال وشارة التوثيق ظاهرة للآخرين. رسائلك لا يراها إلا من تحادثه. لا يظهر بريدك الإلكتروني ولا صور التوثيق أبدًا.

7. الاحتفاظ والحذف
نحتفظ ببياناتك ما دام حسابك قائمًا. يمكنك حذف حسابك في أي وقت من الإعدادات > حذف الحساب؛ فيُحذف ملفك وصورك ورسائلك وسجلات التوثيق. يستغرق الحذف من النسخ الاحتياطية حتى 30 يومًا. إن لم تتمكن من الوصول إلى التطبيق: ${SUPPORT_EMAIL}.

8. حقوقك
الوصول والتصحيح والحذف والاعتراض وسحب الموافقة ونقل البيانات. للتواصل: ${SUPPORT_EMAIL}.

9. الأمان
الاتصالات مشفّرة، والوصول إلى قاعدة البيانات مقيّد بقواعد أمان على مستوى الصفوف.

10. القاصرون
التطبيق غير موجّه لمن هم دون 18 عامًا، وتُحذف هذه الحسابات عند اكتشافها.

11. التغييرات والتواصل
قد نحدّث هذه السياسة وسنعلن عن التغييرات المهمة داخل التطبيق. للتواصل: ${SUPPORT_EMAIL}`,
};

export const TERMS: Record<Language, string> = {
  tr: `Birthchat Kullanım Koşulları
Son güncelleme: ${UPDATED}

1. Kabul
Birthchat'i kullanarak bu koşulları ve Gizlilik Politikası'nı kabul etmiş olursunuz.

2. Uygunluk
En az 18 yaşında olmalısınız. Hesap bilgilerinizin doğru olması ve tek bir kişisel hesap kullanmanız gerekir.

3. Davranış kuralları
Şunlar kesinlikle yasaktır: taciz, tehdit, nefret söylemi; çıplaklık veya müstehcen içerik; sahte profil, başkasının fotoğrafını kullanma; dolandırıcılık, para isteme, spam ve reklam; 18 yaş altını içeren her türlü içerik; yasa dışı faaliyetler. Uygunsuz içeriğe ve kötüye kullanıma sıfır tolerans uygularız.

4. Şikâyet ve engelleme
Rahatsız edici kullanıcıları profillerinden veya sohbetten şikâyet edebilir ve engelleyebilirsiniz. Şikâyetler 24 saat içinde incelenir; kurallara aykırı içerik kaldırılır ve ilgili hesap askıya alınır veya kapatılır.

5. İçeriğiniz
Paylaştığınız içeriğin sorumluluğu size aittir. Hizmeti sunmak için bu içeriği saklama ve diğer kullanıcılara gösterme izni verirsiniz. Hesabınızı sildiğinizde bu izin sona erer.

6. Doğrulama
Mavi rozet, yüz doğrulamasının tamamlandığını gösterir; bir kişinin niyetini veya güvenilirliğini garanti etmez. Tanışırken her zaman dikkatli olun.

7. Premium ve krediler
Ücretli özellikler Google Play üzerinden satın alınır; fiyatlar uygulamada gösterilir. Abonelikler Google Play hesabınızdan yönetilir ve iptal edilebilir. İadeler Google Play politikalarına tabidir.

8. Hesabın kapatılması
Hesabınızı istediğiniz zaman silebilirsiniz. Koşulları ihlal eden hesapları uyarı vermeden kapatabiliriz.

9. Sorumluluk
Hizmet "olduğu gibi" sunulur. Kullanıcılar arasındaki görüşme ve buluşmalardan doğan zararlardan, yasaların izin verdiği ölçüde sorumlu değiliz.

10. Uygulanacak hukuk
Bu koşullar Türkiye Cumhuriyeti hukukuna tabidir; tüketici olarak ikamet ettiğiniz ülkenin zorunlu hükümleri saklıdır.

11. İletişim
${SUPPORT_EMAIL}`,

  en: `Birthchat Terms of Use
Last updated: ${UPDATED}

1. Acceptance
By using Birthchat you accept these terms and the Privacy Policy.

2. Eligibility
You must be at least 18 years old. Your account details must be accurate and you may use only one personal account.

3. Rules of conduct
Strictly prohibited: harassment, threats, hate speech; nudity or sexual content; fake profiles or using someone else's photos; scams, asking for money, spam and advertising; any content involving minors; illegal activity. We have zero tolerance for objectionable content and abusive users.

4. Reporting and blocking
You can report and block users from their profile or from the chat. Reports are reviewed within 24 hours; violating content is removed and the account is suspended or terminated.

5. Your content
You are responsible for what you share. You allow us to store it and show it to other users in order to provide the service. This permission ends when you delete your account.

6. Verification
The blue badge means face verification was completed; it does not guarantee anyone's intentions or trustworthiness. Always be careful when meeting people.

7. Premium and credits
Paid features are purchased through Google Play; prices are shown in the app. Subscriptions are managed and cancelled in your Google Play account. Refunds follow Google Play policies.

8. Termination
You may delete your account at any time. We may close accounts that violate these terms without notice.

9. Liability
The service is provided "as is". To the extent permitted by law, we are not liable for damages arising from conversations or meetings between users.

10. Governing law
These terms are governed by the laws of the Republic of Türkiye; mandatory consumer protections of your country of residence remain unaffected.

11. Contact
${SUPPORT_EMAIL}`,

  de: `Birthchat Nutzungsbedingungen
Zuletzt aktualisiert: ${UPDATED}

1. Zustimmung
Mit der Nutzung von Birthchat akzeptierst du diese Bedingungen und die Datenschutzerklärung.

2. Voraussetzungen
Du musst mindestens 18 Jahre alt sein, wahre Angaben machen und darfst nur ein persönliches Konto nutzen.

3. Verhaltensregeln
Streng verboten: Belästigung, Drohungen, Hassrede; Nacktheit oder sexuelle Inhalte; Fake-Profile oder fremde Fotos; Betrug, Geldforderungen, Spam und Werbung; jegliche Inhalte mit Minderjährigen; illegale Aktivitäten. Für anstößige Inhalte und missbräuchliche Nutzer gilt null Toleranz.

4. Melden und Blockieren
Du kannst Nutzer im Profil oder im Chat melden und blockieren. Meldungen werden innerhalb von 24 Stunden geprüft; Verstöße werden entfernt und das Konto gesperrt oder gelöscht.

5. Deine Inhalte
Du bist für deine Inhalte verantwortlich und erlaubst uns, sie zur Bereitstellung des Dienstes zu speichern und anderen Nutzern anzuzeigen. Die Erlaubnis endet mit der Kontolöschung.

6. Verifizierung
Das blaue Abzeichen zeigt eine abgeschlossene Gesichtsverifizierung; es garantiert nicht die Absichten oder Vertrauenswürdigkeit einer Person. Sei bei Treffen immer vorsichtig.

7. Premium und Credits
Kostenpflichtige Funktionen werden über Google Play gekauft; Preise stehen in der App. Abos verwaltest und kündigst du in deinem Google-Play-Konto. Erstattungen richten sich nach den Google-Play-Richtlinien.

8. Beendigung
Du kannst dein Konto jederzeit löschen. Wir können Konten bei Verstößen ohne Vorankündigung schließen.

9. Haftung
Der Dienst wird „wie besehen“ bereitgestellt. Soweit gesetzlich zulässig, haften wir nicht für Schäden aus Gesprächen oder Treffen zwischen Nutzern.

10. Anwendbares Recht
Es gilt das Recht der Republik Türkei; zwingende Verbraucherschutzvorschriften deines Wohnsitzlandes bleiben unberührt.

11. Kontakt
${SUPPORT_EMAIL}`,

  fr: `Conditions d'utilisation de Birthchat
Dernière mise à jour : ${UPDATED}

1. Acceptation
En utilisant Birthchat, vous acceptez ces conditions et la politique de confidentialité.

2. Conditions d'accès
Vous devez avoir au moins 18 ans, fournir des informations exactes et n'utiliser qu'un seul compte personnel.

3. Règles de conduite
Strictement interdits : harcèlement, menaces, discours haineux ; nudité ou contenu sexuel ; faux profils ou photos d'autrui ; arnaques, demandes d'argent, spam et publicité ; tout contenu impliquant des mineurs ; activités illégales. Tolérance zéro pour les contenus choquants et les utilisateurs abusifs.

4. Signalement et blocage
Vous pouvez signaler et bloquer un utilisateur depuis son profil ou la discussion. Les signalements sont examinés sous 24 heures ; le contenu fautif est supprimé et le compte suspendu ou fermé.

5. Votre contenu
Vous êtes responsable de ce que vous partagez et nous autorisez à le stocker et à l'afficher aux autres utilisateurs pour fournir le service. Cette autorisation prend fin à la suppression du compte.

6. Vérification
Le badge bleu indique une vérification faciale réussie ; il ne garantit ni les intentions ni la fiabilité d'une personne. Restez prudent lors des rencontres.

7. Premium et crédits
Les fonctionnalités payantes s'achètent via Google Play ; les prix sont indiqués dans l'application. Les abonnements se gèrent et se résilient dans votre compte Google Play. Les remboursements suivent les règles de Google Play.

8. Résiliation
Vous pouvez supprimer votre compte à tout moment. Nous pouvons fermer sans préavis les comptes qui enfreignent ces conditions.

9. Responsabilité
Le service est fourni « en l'état ». Dans la limite autorisée par la loi, nous ne sommes pas responsables des dommages liés aux échanges ou rencontres entre utilisateurs.

10. Droit applicable
Ces conditions sont régies par le droit de la République de Turquie, sans préjudice des protections impératives de votre pays de résidence.

11. Contact
${SUPPORT_EMAIL}`,

  es: `Términos de uso de Birthchat
Última actualización: ${UPDATED}

1. Aceptación
Al usar Birthchat aceptas estos términos y la política de privacidad.

2. Requisitos
Debes tener al menos 18 años, dar datos veraces y usar una sola cuenta personal.

3. Normas de conducta
Está terminantemente prohibido: acoso, amenazas, discurso de odio; desnudos o contenido sexual; perfiles falsos o fotos de otras personas; estafas, pedir dinero, spam y publicidad; cualquier contenido con menores; actividades ilegales. Tolerancia cero con el contenido ofensivo y los usuarios abusivos.

4. Denuncias y bloqueos
Puedes denunciar y bloquear usuarios desde su perfil o desde el chat. Las denuncias se revisan en 24 horas; el contenido infractor se elimina y la cuenta se suspende o cierra.

5. Tu contenido
Eres responsable de lo que compartes y nos permites guardarlo y mostrarlo a otros usuarios para prestar el servicio. El permiso termina al eliminar la cuenta.

6. Verificación
La insignia azul indica que se completó la verificación facial; no garantiza las intenciones ni la fiabilidad de nadie. Ten siempre cuidado al quedar con alguien.

7. Premium y créditos
Las funciones de pago se compran en Google Play; los precios se muestran en la app. Las suscripciones se gestionan y cancelan desde tu cuenta de Google Play. Los reembolsos siguen las políticas de Google Play.

8. Cancelación
Puedes eliminar tu cuenta cuando quieras. Podemos cerrar sin aviso las cuentas que incumplan estos términos.

9. Responsabilidad
El servicio se ofrece «tal cual». En la medida permitida por la ley, no respondemos de daños derivados de conversaciones o encuentros entre usuarios.

10. Ley aplicable
Estos términos se rigen por las leyes de la República de Turquía, sin perjuicio de las protecciones obligatorias de tu país de residencia.

11. Contacto
${SUPPORT_EMAIL}`,

  ru: `Условия использования Birthchat
Последнее обновление: ${UPDATED}

1. Согласие
Используя Birthchat, вы принимаете эти условия и Политику конфиденциальности.

2. Требования
Вам должно быть не меньше 18 лет, данные аккаунта должны быть достоверными, допускается только один личный аккаунт.

3. Правила поведения
Строго запрещено: домогательства, угрозы, язык вражды; нагота и сексуальный контент; фейковые профили и чужие фото; мошенничество, просьбы о деньгах, спам и реклама; любой контент с участием несовершеннолетних; незаконная деятельность. К оскорбительному контенту и нарушителям — нулевая терпимость.

4. Жалобы и блокировка
Пожаловаться на пользователя и заблокировать его можно в профиле или чате. Жалобы рассматриваются в течение 24 часов; нарушающий контент удаляется, аккаунт блокируется или закрывается.

5. Ваш контент
Вы отвечаете за то, чем делитесь, и разрешаете нам хранить и показывать это другим пользователям для работы сервиса. Разрешение прекращается при удалении аккаунта.

6. Проверка
Синий значок означает пройденную проверку лица; он не гарантирует намерения или надёжность человека. Будьте осторожны при встречах.

7. Premium и кредиты
Платные функции покупаются через Google Play; цены указаны в приложении. Подписками можно управлять и отменять их в аккаунте Google Play. Возвраты — по правилам Google Play.

8. Прекращение
Вы можете удалить аккаунт в любое время. Мы можем без предупреждения закрыть аккаунты, нарушающие условия.

9. Ответственность
Сервис предоставляется «как есть». В пределах, допустимых законом, мы не несём ответственности за ущерб от общения или встреч пользователей.

10. Применимое право
Условия регулируются законодательством Турецкой Республики; обязательные нормы защиты потребителей вашей страны сохраняются.

11. Контакты
${SUPPORT_EMAIL}`,

  ar: `شروط استخدام Birthchat
آخر تحديث: ${UPDATED}

1. القبول
باستخدامك Birthchat فإنك توافق على هذه الشروط وعلى سياسة الخصوصية.

2. الأهلية
يجب ألا يقل عمرك عن 18 عامًا، وأن تكون بيانات حسابك صحيحة، وأن تستخدم حسابًا شخصيًا واحدًا فقط.

3. قواعد السلوك
يُمنع منعًا باتًا: التحرش والتهديد وخطاب الكراهية؛ العري أو المحتوى الجنسي؛ الحسابات المزيفة أو استخدام صور الآخرين؛ الاحتيال وطلب المال والرسائل المزعجة والإعلانات؛ أي محتوى يتعلق بالقاصرين؛ الأنشطة غير القانونية. لا تسامح مطلقًا مع المحتوى المسيء والمستخدمين المسيئين.

4. الإبلاغ والحظر
يمكنك الإبلاغ عن المستخدمين وحظرهم من ملفهم أو من المحادثة. تُراجع البلاغات خلال 24 ساعة، ويُحذف المحتوى المخالف ويُعلّق الحساب أو يُغلق.

5. محتواك
أنت مسؤول عما تشاركه، وتأذن لنا بتخزينه وعرضه على المستخدمين الآخرين لتقديم الخدمة. ينتهي هذا الإذن عند حذف حسابك.

6. التوثيق
تعني الشارة الزرقاء اكتمال توثيق الوجه، ولا تضمن نوايا أي شخص أو موثوقيته. كن حذرًا دائمًا عند اللقاء.

7. الاشتراك المميز والرصيد
تُشترى الميزات المدفوعة عبر Google Play وتظهر الأسعار في التطبيق. تُدار الاشتراكات وتُلغى من حسابك في Google Play، وتخضع المبالغ المستردة لسياسات Google Play.

8. إنهاء الحساب
يمكنك حذف حسابك في أي وقت، ويحق لنا إغلاق الحسابات المخالفة دون إشعار.

9. المسؤولية
تُقدَّم الخدمة "كما هي". لا نتحمل، في الحدود التي يسمح بها القانون، مسؤولية الأضرار الناتجة عن المحادثات أو اللقاءات بين المستخدمين.

10. القانون الواجب التطبيق
تخضع هذه الشروط لقوانين الجمهورية التركية مع مراعاة الحمايات الإلزامية للمستهلك في بلد إقامتك.

11. التواصل
${SUPPORT_EMAIL}`,
};

/** Child Safety Standards (Google Play CSAE policy) – published at necatisen.github.io/birthchat/child-safety */
export const CHILD_SAFETY: Record<Language, string> = {
  tr: `Birthchat Çocuk Güvenliği Standartları
Son güncelleme: 18.11.2026

1. Sıfır tolerans
Birthchat, çocukların cinsel istismarı ve sömürüsüne (CSAE) ve çocuk cinsel istismarı materyaline (CSAM) karşı sıfır tolerans uygular. Bu tür içeriği paylaşmak, istemek, tanıtmak veya çocuklarla uygunsuz iletişim kurmaya çalışmak kesinlikle yasaktır.

2. Yalnızca yetişkinler
Birthchat yalnızca 18 yaş ve üzeri kişiler içindir. Kayıt sırasında doğum tarihi istenir ve 18 yaşından küçükler hesap açamaz. Reşit olmadığı anlaşılan hesaplar derhal kapatılır.

3. Önleme
• Profil fotoğrafları ve içerikler topluluk kurallarımıza tabidir.
• Yüz doğrulaması (canlılık testi) sahte ve başkasına ait profilleri azaltır.
• Kurallara aykırı içerik ve davranış bildirildiğinde incelenir.

4. Bildirme
• Uygulama içinde: kullanıcının profilinden veya sohbet ekranından "Şikâyet et" ve "Engelle" seçenekleriyle.
• E-posta ile: ${SUPPORT_EMAIL} (konu: "Çocuk güvenliği").
Çocuk güvenliğiyle ilgili bildirimler önceliklidir ve 24 saat içinde incelenir.

5. Yaptırımlar
CSAE/CSAM içeren veya buna yönelik her içerik kaldırılır, ilgili hesap kalıcı olarak kapatılır. Yasaların gerektirdiği durumlarda içerik ve hesap bilgileri yetkili makamlara ve ilgili kuruluşlara (ör. NCMEC) bildirilir.

6. Yasal uyum
Çocuk güvenliğine ilişkin yürürlükteki yasalara uyarız ve kolluk kuvvetleriyle iş birliği yaparız.

7. İletişim
Çocuk güvenliği uygulamalarımız hakkındaki sorular için: ${SUPPORT_EMAIL}`,

  en: `Birthchat Child Safety Standards
Last updated: 18.11.2026

1. Zero tolerance
Birthchat has zero tolerance for child sexual abuse and exploitation (CSAE) and child sexual abuse material (CSAM). Sharing, requesting or promoting such content, or attempting to contact minors inappropriately, is strictly prohibited.

2. Adults only
Birthchat is only for people aged 18 and over. A date of birth is required at sign-up and anyone under 18 cannot create an account. Accounts found to belong to minors are closed immediately.

3. Prevention
• Profile photos and content are subject to our community rules.
• Face verification (liveness check) reduces fake and impersonating profiles.
• Reported content and behaviour that breaks the rules is reviewed.

4. Reporting
• In the app: use "Report" and "Block" on a user's profile or in the chat screen.
• By email: ${SUPPORT_EMAIL} (subject: "Child safety").
Child-safety reports are prioritised and reviewed within 24 hours.

5. Enforcement
Any content involving or aimed at CSAE/CSAM is removed and the account is permanently banned. Where required by law, content and account information are reported to the competent authorities and relevant organisations (e.g. NCMEC).

6. Legal compliance
We comply with applicable child-safety laws and cooperate with law enforcement.

7. Contact
For questions about our child-safety practices: ${SUPPORT_EMAIL}`,

  de: `Birthchat Kinderschutzstandards
Zuletzt aktualisiert: 18.11.2026

1. Null Toleranz
Birthchat toleriert keinerlei sexuellen Missbrauch und Ausbeutung von Kindern (CSAE) sowie Darstellungen sexuellen Kindesmissbrauchs (CSAM). Das Teilen, Anfordern oder Bewerben solcher Inhalte sowie unangemessene Kontaktversuche zu Minderjährigen sind streng verboten.

2. Nur für Erwachsene
Birthchat ist nur für Personen ab 18 Jahren. Bei der Registrierung ist das Geburtsdatum anzugeben; unter 18-Jährige können kein Konto erstellen. Konten von Minderjährigen werden sofort geschlossen.

3. Prävention
• Profilfotos und Inhalte unterliegen unseren Community-Regeln.
• Die Gesichtsverifizierung (Lebendigkeitsprüfung) reduziert gefälschte Profile.
• Gemeldete Inhalte und regelwidriges Verhalten werden geprüft.

4. Melden
• In der App: über „Melden“ und „Blockieren“ im Profil oder im Chat.
• Per E-Mail: ${SUPPORT_EMAIL} (Betreff: „Kinderschutz“).
Meldungen zum Kinderschutz haben Vorrang und werden innerhalb von 24 Stunden geprüft.

5. Maßnahmen
Inhalte mit oder zu CSAE/CSAM werden entfernt und das Konto dauerhaft gesperrt. Soweit gesetzlich vorgeschrieben, werden Inhalte und Kontodaten an die zuständigen Behörden und Organisationen (z. B. NCMEC) gemeldet.

6. Rechtliche Vorgaben
Wir halten die geltenden Kinderschutzgesetze ein und arbeiten mit Strafverfolgungsbehörden zusammen.

7. Kontakt
Fragen zu unseren Kinderschutzmaßnahmen: ${SUPPORT_EMAIL}`,

  fr: `Normes de sécurité des enfants de Birthchat
Dernière mise à jour : 18.11.2026

1. Tolérance zéro
Birthchat applique une tolérance zéro envers l'abus et l'exploitation sexuels des enfants (CSAE) et les contenus d'abus sexuels sur enfants (CSAM). Partager, demander ou promouvoir de tels contenus, ou tenter de contacter des mineurs de manière inappropriée, est strictement interdit.

2. Réservé aux adultes
Birthchat est réservée aux personnes de 18 ans et plus. La date de naissance est demandée à l'inscription et les moins de 18 ans ne peuvent pas créer de compte. Les comptes appartenant à des mineurs sont fermés immédiatement.

3. Prévention
• Les photos de profil et les contenus sont soumis à nos règles communautaires.
• La vérification faciale (test de présence) limite les faux profils et usurpations.
• Les contenus et comportements signalés sont examinés.

4. Signalement
• Dans l'application : « Signaler » et « Bloquer » depuis le profil ou la conversation.
• Par e-mail : ${SUPPORT_EMAIL} (objet : « Sécurité des enfants »).
Les signalements liés à la sécurité des enfants sont prioritaires et traités sous 24 heures.

5. Sanctions
Tout contenu impliquant ou visant la CSAE/CSAM est supprimé et le compte est banni définitivement. Lorsque la loi l'exige, les contenus et informations de compte sont signalés aux autorités compétentes et aux organismes concernés (ex. NCMEC).

6. Conformité légale
Nous respectons les lois applicables en matière de protection de l'enfance et coopérons avec les forces de l'ordre.

7. Contact
Pour toute question sur nos pratiques de sécurité des enfants : ${SUPPORT_EMAIL}`,

  es: `Normas de seguridad infantil de Birthchat
Última actualización: 18.11.2026

1. Tolerancia cero
Birthchat aplica tolerancia cero al abuso y la explotación sexual infantil (CSAE) y al material de abuso sexual infantil (CSAM). Está estrictamente prohibido compartir, solicitar o promover dicho contenido, o intentar contactar con menores de forma inapropiada.

2. Solo adultos
Birthchat es solo para mayores de 18 años. Se pide la fecha de nacimiento al registrarse y los menores de 18 no pueden crear una cuenta. Las cuentas de menores se cierran de inmediato.

3. Prevención
• Las fotos de perfil y el contenido están sujetos a nuestras normas de la comunidad.
• La verificación facial (prueba de vida) reduce los perfiles falsos y suplantaciones.
• El contenido y las conductas denunciadas se revisan.

4. Denuncias
• En la app: con «Denunciar» y «Bloquear» en el perfil del usuario o en el chat.
• Por correo: ${SUPPORT_EMAIL} (asunto: «Seguridad infantil»).
Las denuncias de seguridad infantil tienen prioridad y se revisan en 24 horas.

5. Medidas
Todo contenido relacionado con CSAE/CSAM se elimina y la cuenta se bloquea de forma permanente. Cuando la ley lo exige, el contenido y los datos de la cuenta se comunican a las autoridades y organizaciones competentes (p. ej., NCMEC).

6. Cumplimiento legal
Cumplimos las leyes de protección infantil aplicables y colaboramos con las fuerzas del orden.

7. Contacto
Para preguntas sobre nuestras prácticas de seguridad infantil: ${SUPPORT_EMAIL}`,

  ru: `Стандарты безопасности детей Birthchat
Последнее обновление: 18.11.2026

1. Нулевая терпимость
Birthchat придерживается нулевой терпимости к сексуальному насилию и эксплуатации детей (CSAE) и материалам сексуального насилия над детьми (CSAM). Публикация, запрос или распространение таких материалов, а также попытки ненадлежащего контакта с несовершеннолетними строго запрещены.

2. Только для взрослых
Birthchat предназначен только для лиц от 18 лет. При регистрации требуется дата рождения, лица младше 18 лет не могут создать аккаунт. Аккаунты несовершеннолетних немедленно закрываются.

3. Профилактика
• Фото профиля и контент подчиняются правилам сообщества.
• Проверка лица (тест на живость) снижает число фейковых профилей.
• Жалобы на контент и нарушения правил рассматриваются.

4. Как сообщить
• В приложении: «Пожаловаться» и «Заблокировать» в профиле пользователя или в чате.
• По почте: ${SUPPORT_EMAIL} (тема: «Безопасность детей»).
Жалобы, связанные с безопасностью детей, рассматриваются в приоритетном порядке в течение 24 часов.

5. Меры
Любой контент, связанный с CSAE/CSAM, удаляется, а аккаунт блокируется навсегда. В случаях, предусмотренных законом, контент и данные аккаунта передаются компетентным органам и организациям (например, NCMEC).

6. Соблюдение законов
Мы соблюдаем применимые законы о защите детей и сотрудничаем с правоохранительными органами.

7. Контакты
Вопросы о наших мерах по защите детей: ${SUPPORT_EMAIL}`,

  ar: `معايير سلامة الأطفال في Birthchat
آخر تحديث: 18.11.2026

1. عدم التسامح مطلقًا
يطبّق Birthchat سياسة عدم التسامح مطلقًا مع الاعتداء الجنسي على الأطفال واستغلالهم (CSAE) ومواد الاعتداء الجنسي على الأطفال (CSAM). يُحظر تمامًا نشر هذا المحتوى أو طلبه أو الترويج له، أو محاولة التواصل مع القاصرين بشكل غير لائق.

2. للبالغين فقط
التطبيق مخصص فقط لمن هم في سن 18 عامًا فأكثر. يُطلب تاريخ الميلاد عند التسجيل، ولا يمكن لمن هم دون 18 عامًا إنشاء حساب. تُغلق حسابات القاصرين فور اكتشافها.

3. الوقاية
• تخضع صور الملف الشخصي والمحتوى لقواعد المجتمع.
• يقلّل التحقق من الوجه (اختبار الحيوية) من الحسابات المزيفة وانتحال الشخصية.
• تتم مراجعة المحتوى والسلوك المُبلّغ عنه.

4. الإبلاغ
• داخل التطبيق: عبر خياري «إبلاغ» و«حظر» في الملف الشخصي أو في المحادثة.
• عبر البريد: ${SUPPORT_EMAIL} (الموضوع: «سلامة الأطفال»).
تحظى البلاغات المتعلقة بسلامة الأطفال بالأولوية وتُراجع خلال 24 ساعة.

5. الإجراءات
يُزال أي محتوى يتضمن CSAE/CSAM أو يستهدفه، ويُحظر الحساب نهائيًا. وعندما يقتضي القانون ذلك، يُبلَّغ عن المحتوى وبيانات الحساب إلى السلطات والجهات المختصة (مثل NCMEC).

6. الامتثال القانوني
نلتزم بقوانين حماية الطفل المعمول بها ونتعاون مع جهات إنفاذ القانون.

7. التواصل
للاستفسار عن ممارساتنا في سلامة الأطفال: ${SUPPORT_EMAIL}`,
};
