// Turns raw app screenshots into Google Play marketing screenshots:
// brand night gradient + localized caption + the real screenshot in a rounded frame.
// Input:  <raw>/<device>/<lang>/<nn-screen>.png  (made from the real app UI)
// Output: store/google-play/screenshots/<device>/<lang>/<nn-screen>.png
// Usage:  node scripts/generate-store-screenshots.cjs <rawDir>
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const root = path.join(__dirname, '..');
const rawDir = process.argv[2];
const outRoot = path.join(root, 'store/google-play/screenshots');

// Output sizes accepted by Google Play (ratio ≤ 2:1, sides 320–3840 px).
const SIZES = { phone: [1080, 1920], tablet7: [1200, 1920], tablet10: [1600, 2560] };

const CAPTIONS = {
  '01-welcome': { tr: 'Gerçek insanlar,\ngerçek bağlantılar', en: 'Real people,\nreal connections', de: 'Echte Menschen,\nechte Verbindungen', fr: 'De vraies personnes,\nde vrais liens', es: 'Personas reales,\nconexiones reales', ru: 'Реальные люди,\nнастоящие связи', ar: 'أشخاص حقيقيون،\nعلاقات حقيقية' },
  '02-explore': { tr: 'Kaydır, beğen,\nuyumunu gör', en: 'Swipe, like and\nsee your match score', de: 'Wischen, liken,\nMatch-Wert sehen', fr: 'Swipez, aimez,\nvoyez la compatibilité', es: 'Desliza, da me gusta\ny mira tu afinidad', ru: 'Листайте, лайкайте,\nсмотрите совместимость', ar: 'اسحب، أعجب،\nواكتشف توافقك' },
  '03-chats': { tr: 'Eşleşmelerinle\nanında sohbet', en: 'Chat with your\nmatches instantly', de: 'Sofort mit deinen\nMatches chatten', fr: 'Discutez tout de suite\navec vos matchs', es: 'Chatea al instante\ncon tus matches', ru: 'Общайтесь\nс совпадениями сразу', ar: 'تحدّث فورًا\nمع من تطابقت معهم' },
  '04-conversation': { tr: 'Güvenli ve\nsade mesajlaşma', en: 'Safe and simple\nmessaging', de: 'Sicher und einfach\nschreiben', fr: 'Une messagerie\nsûre et simple', es: 'Mensajería\nsegura y sencilla', ru: 'Безопасная и простая\nпереписка', ar: 'مراسلة\nآمنة وبسيطة' },
  '05-likes': { tr: 'Seni kimin\nbeğendiğini gör', en: 'See who\nlikes you', de: 'Sieh, wer\ndich mag', fr: 'Découvrez\nqui vous aime', es: 'Descubre\na quién le gustas', ru: 'Узнайте,\nкому вы нравитесь', ar: 'اعرف\nمن أُعجب بك' },
  '06-profile': { tr: 'Profilini güçlendir,\ndaha çok eşleş', en: 'Boost your profile,\nget more matches', de: 'Profil stärken,\nmehr Matches', fr: 'Renforcez votre profil,\nplus de matchs', es: 'Mejora tu perfil,\nmás matches', ru: 'Усильте профиль —\nбольше совпадений', ar: 'قوِّ ملفك\nواحصل على تطابقات أكثر' },
  '07-verify': { tr: 'Yüz doğrulamalı\ngüvenli topluluk', en: 'A safe, face-verified\ncommunity', de: 'Sichere Community mit\nGesichtsverifizierung', fr: 'Une communauté sûre,\nvérifiée par le visage', es: 'Comunidad segura\nverificada con el rostro', ru: 'Безопасное сообщество\nс проверкой лица', ar: 'مجتمع آمن\nموثّق بالوجه' },
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function frame(rawPath, outPath, device, lang, screen) {
  const [W, H] = SIZES[device];
  const caption = (CAPTIONS[screen]?.[lang] ?? CAPTIONS[screen]?.en ?? '').split('\n');
  const fontSize = Math.round(W * 0.064);
  const captionH = Math.round(H * 0.2);
  const shotH = H - captionH - Math.round(H * 0.035);
  const meta = await sharp(rawPath).metadata();
  const shotW = Math.round((meta.width / meta.height) * shotH);
  const radius = Math.round(shotW * 0.06);
  const left = Math.round((W - shotW) / 2);
  const top = captionH;

  const rounded = await sharp(rawPath)
    .resize(shotW, shotH)
    .composite([{ input: Buffer.from(`<svg width="${shotW}" height="${shotH}"><rect width="${shotW}" height="${shotH}" rx="${radius}" ry="${radius}"/></svg>`), blend: 'dest-in' }])
    .png()
    .toBuffer();

  const rtl = lang === 'ar';
  const lines = caption
    .map((l, i) => `<text x="${W / 2}" y="${Math.round(captionH * 0.42) + i * Math.round(fontSize * 1.18)}" text-anchor="middle" ${rtl ? 'direction="rtl"' : ''} font-family="Segoe UI, Arial, sans-serif" font-size="${fontSize}" font-weight="800" fill="#FFFFFF">${esc(l)}</text>`)
    .join('');
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B0E24"/><stop offset="0.6" stop-color="#141838"/><stop offset="1" stop-color="#1E1450"/></linearGradient>
      <radialGradient id="o1"><stop offset="0" stop-color="#3D5AFE" stop-opacity="0.55"/><stop offset="1" stop-color="#3D5AFE" stop-opacity="0"/></radialGradient>
      <radialGradient id="o2"><stop offset="0" stop-color="#FF3D8B" stop-opacity="0.5"/><stop offset="1" stop-color="#FF3D8B" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <circle cx="${W * 0.1}" cy="${H * 0.08}" r="${W * 0.6}" fill="url(#o1)"/>
    <circle cx="${W * 0.95}" cy="${H * 0.85}" r="${W * 0.65}" fill="url(#o2)"/>
    <rect x="${left - 6}" y="${top - 6}" width="${shotW + 12}" height="${shotH + 12}" rx="${radius + 6}" fill="#FFFFFF" fill-opacity="0.12"/>
    ${lines}
  </svg>`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await sharp(bg).composite([{ input: rounded, left, top }]).png().toFile(outPath);
}

(async () => {
  let n = 0;
  for (const device of fs.readdirSync(rawDir).filter((d) => SIZES[d])) {
    for (const lang of fs.readdirSync(path.join(rawDir, device))) {
      for (const file of fs.readdirSync(path.join(rawDir, device, lang)).filter((f) => f.endsWith('.png'))) {
        const screen = file.replace('.png', '');
        await frame(path.join(rawDir, device, lang, file), path.join(outRoot, device, lang, file), device, lang, screen);
        n++;
      }
    }
  }
  console.log(`framed ${n} screenshots → store/google-play/screenshots`);
})();
