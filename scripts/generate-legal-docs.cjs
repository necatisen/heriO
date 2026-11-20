// Publishes the in-app legal texts (lib/legal.ts) as GitHub Pages documents for Google Play:
//   <siteDir>/privacy-policy.md, terms.md, delete-account.md, index.md
// <siteDir> is the local clone of github.com/necatisen/birthchat (GitHub Pages).
// Usage: node scripts/generate-legal-docs.cjs [siteDir=../../birthchat-site]
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const root = path.join(__dirname, '..');
const site = path.resolve(process.argv[2] || path.join(root, '../../birthchat-site'));
fs.mkdirSync(site, { recursive: true });

const code = fs.readFileSync(path.join(root, 'lib/legal.ts'), 'utf8');
const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', 'require', js)(mod, mod.exports, () => ({}));
const { PRIVACY, TERMS, CHILD_SAFETY, KVKK, EXPLICIT_CONSENT, SUPPORT_EMAIL } = mod.exports;

const ORDER = [
  ['en', 'English'],
  ['tr', 'Türkçe'],
  ['de', 'Deutsch'],
  ['fr', 'Français'],
  ['es', 'Español'],
  ['ru', 'Русский'],
  ['ar', 'العربية'],
];

function toMarkdown(text) {
  const [title, ...rest] = text.trim().split('\n');
  return [
    `## ${title}`,
    '',
    ...rest.map((l) => (/^\d+\.\s/.test(l) ? `\n### ${l}` : l.startsWith('•') ? `- ${l.slice(1).trim()}` : l)),
  ].join('\n');
}

function page(title, dict, order = ORDER) {
  const nav = order.map(([l, n]) => `[${n}](#${l})`).join(' · ');
  const body = order.map(([l]) => {
    const md = toMarkdown(dict[l]);
    return l === 'ar' ? `<a id="${l}"></a>\n<div dir="rtl" markdown="1">\n\n${md}\n\n</div>` : `<a id="${l}"></a>\n\n${md}`;
  }).join('\n\n---\n\n');
  return `---\ntitle: ${title}\n---\n\n# ${title}\n\n${nav}\n\n${body}\n`;
}

fs.writeFileSync(path.join(site, 'privacy-policy.md'), page('Birthchat – Privacy Policy', PRIVACY));
fs.writeFileSync(path.join(site, 'terms.md'), page('Birthchat – Terms of Use', TERMS));
fs.writeFileSync(path.join(site, 'child-safety.md'), page('Birthchat – Child Safety Standards', CHILD_SAFETY));
// KVKK texts exist in Turkish and English only.
const TR_EN = ORDER.filter(([l]) => l === 'tr' || l === 'en');
fs.writeFileSync(path.join(site, 'kvkk.md'), page('Birthchat – KVKK Aydınlatma Metni / Personal Data Notice', KVKK, TR_EN));
fs.writeFileSync(path.join(site, 'explicit-consent.md'), page('Birthchat – Açık Rıza Metni / Explicit Consent', EXPLICIT_CONSENT, TR_EN));

const del = `---
title: Birthchat – Delete your account
---

# Delete your Birthchat account

[English](#en) · [Türkçe](#tr)

<a id="en"></a>

## English

**In the app (fastest):**
1. Open Birthchat and sign in.
2. Go to **Profile → Settings (⚙️)**.
3. Tap **Delete Account** and confirm.

**Without the app:** send an email to **${SUPPORT_EMAIL}** from the address you registered with, with the subject *"Delete my account"*. We delete the account within 7 days and confirm by email.

**What is deleted:** your account, profile details, photos, messages, likes, matches, visitor records, push tokens and face-verification images.
**What may be kept:** records we must keep by law (for example, reports about rule violations) for up to 6 months; encrypted backups are purged within 30 days.

---

<a id="tr"></a>

## Türkçe

**Uygulama içinden (en hızlı yol):**
1. Birthchat'i açın ve giriş yapın.
2. **Profil → Ayarlar (⚙️)** bölümüne gidin.
3. **Hesabı Sil**'e dokunun ve onaylayın.

**Uygulamaya erişemiyorsanız:** kayıtlı e-posta adresinizden **${SUPPORT_EMAIL}** adresine *"Hesabımı sil"* konulu bir e-posta gönderin. Hesabınız 7 gün içinde silinir ve size e-postayla bilgi verilir.

**Silinenler:** hesabınız, profil bilgileriniz, fotoğraflarınız, mesajlarınız, beğenileriniz, eşleşmeleriniz, ziyaretçi kayıtlarınız, bildirim anahtarlarınız ve yüz doğrulama görüntüleriniz.
**Saklanabilecekler:** yasal olarak tutmamız gereken kayıtlar (ör. kural ihlali şikâyetleri) en fazla 6 ay; şifreli yedekler 30 gün içinde temizlenir.
`;
fs.writeFileSync(path.join(site, 'delete-account.md'), del);
const index = `---
title: Birthchat
---

# Birthchat

Meet face-verified real people, see your match score and chat safely.

- [Privacy Policy / Gizlilik Politikası](./privacy-policy)
- [Terms of Use / Kullanım Koşulları](./terms)
- [Delete your account / Hesabı silme](./delete-account)
- [Child Safety Standards / Çocuk Güvenliği Standartları](./child-safety)
- [KVKK Aydınlatma Metni / Personal Data Notice](./kvkk)
- [Açık Rıza Metni / Explicit Consent](./explicit-consent)

Contact / İletişim: **${SUPPORT_EMAIL}**
`;
fs.writeFileSync(path.join(site, 'index.md'), index);

// Landing page for the sign-up confirmation link (Supabase emailRedirectTo).
const CONFIRMED = [
  ['en', 'Your email is confirmed', 'Go back to the Birthchat app and sign in with your email and password.'],
  ['tr', 'E-postanız onaylandı', 'Birthchat uygulamasına dönün ve e-posta adresiniz ile şifrenizle giriş yapın.'],
  ['de', 'Deine E-Mail ist bestätigt', 'Kehre zur Birthchat-App zurück und melde dich mit E-Mail und Passwort an.'],
  ['fr', 'Votre e-mail est confirmé', "Revenez dans l'application Birthchat et connectez-vous avec votre e-mail et votre mot de passe."],
  ['es', 'Tu correo está confirmado', 'Vuelve a la app Birthchat e inicia sesión con tu correo y contraseña.'],
  ['ru', 'Почта подтверждена', 'Вернитесь в приложение Birthchat и войдите, используя почту и пароль.'],
  ['ar', 'تم تأكيد بريدك الإلكتروني', 'عد إلى تطبيق Birthchat وسجّل الدخول ببريدك الإلكتروني وكلمة المرور.'],
];
const confirmedBody = CONFIRMED.map(([l, title, text]) => {
  const block = `## ✅ ${title}\n\n${text}`;
  return l === 'ar' ? `<div dir="rtl" markdown="1">\n\n${block}\n\n</div>` : block;
}).join('\n\n---\n\n');
fs.writeFileSync(
  path.join(site, 'email-confirmed.md'),
  `---\ntitle: Birthchat – Email confirmed\n---\n\n${confirmedBody}\n\n---\n\n${SUPPORT_EMAIL}\n`
);

fs.writeFileSync(
  path.join(site, '_config.yml'),
  ['title: Birthchat', 'description: Meet face-verified real people and chat safely.', 'theme: jekyll-theme-cayman', ''].join('\n')
);
// Own layout (Cayman look) without the theme's Google Fonts request: no visitor data goes to Google.
fs.mkdirSync(path.join(site, '_layouts'), { recursive: true });
fs.writeFileSync(
  path.join(site, '_layouts', 'default.html'),
  `<!DOCTYPE html>
<html lang="{{ site.lang | default: 'en' }}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ page.title | default: site.title }}</title>
    <meta name="description" content="{{ site.description }}">
    <link rel="stylesheet" href="{{ '/assets/css/style.css?v=' | append: site.github.build_revision | relative_url }}">
    <style>
      body, h1, h2, h3, h4, .btn { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    </style>
  </head>
  <body>
    <header class="page-header" role="banner">
      <h1 class="project-name">{{ site.title }}</h1>
      <h2 class="project-tagline">{{ site.description }}</h2>
    </header>
    <main id="content" class="main-content" role="main">
      {{ content }}
      <footer class="site-footer">
        <span class="site-footer-credits">${SUPPORT_EMAIL}</span>
      </footer>
    </main>
  </body>
</html>
`
);
console.log('wrote legal pages to', site);
