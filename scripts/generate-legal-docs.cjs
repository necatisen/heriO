// Publishes the in-app legal texts (lib/legal.ts) as GitHub Pages documents for Google Play:
//   docs/privacy-policy.md, docs/terms.md, docs/delete-account.md
// Usage: node scripts/generate-legal-docs.cjs
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const root = path.join(__dirname, '..');

const code = fs.readFileSync(path.join(root, 'lib/legal.ts'), 'utf8');
const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', 'require', js)(mod, mod.exports, () => ({}));
const { PRIVACY, TERMS, SUPPORT_EMAIL } = mod.exports;

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

function page(title, dict) {
  const nav = ORDER.map(([l, n]) => `[${n}](#${l})`).join(' · ');
  const body = ORDER.map(([l]) => {
    const md = toMarkdown(dict[l]);
    return l === 'ar' ? `<a id="${l}"></a>\n<div dir="rtl" markdown="1">\n\n${md}\n\n</div>` : `<a id="${l}"></a>\n\n${md}`;
  }).join('\n\n---\n\n');
  return `---\ntitle: ${title}\n---\n\n# ${title}\n\n${nav}\n\n${body}\n`;
}

fs.writeFileSync(path.join(root, 'docs/privacy-policy.md'), page('Birthchat – Privacy Policy', PRIVACY));
fs.writeFileSync(path.join(root, 'docs/terms.md'), page('Birthchat – Terms of Use', TERMS));
fs.rmSync(path.join(root, 'docs/privacy-policy-en.md'), { force: true });

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
fs.writeFileSync(path.join(root, 'docs/delete-account.md'), del);
console.log('wrote docs/privacy-policy.md, docs/terms.md, docs/delete-account.md');
