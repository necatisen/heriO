/**
 * Google Play store assets — login, keşfet, mesajlar, beğenilenler, ayarlar + premium vurguları
 * Run: node scripts/generate-google-play-assets.mjs
 */
import sharp from "sharp";
import { readFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "store", "google-play");
const logoPath = join(root, "assets", "images", "heriokalp-logo.png");
const iconPath = join(root, "assets", "icon.png");

// Uygulama teması (ThemeContext ile uyumlu)
const C = {
  primary: "#4A90E2",
  primary2: "#50C9E9",
  accent: "#FF6B9D",
  gold: "#FFB800",
  goldDark: "#E6A000",
  goldLight: "#FFF4D6",
  bg: "#F5F5F5",
  surface: "#FFFFFF",
  text: "#1A1A1A",
  muted: "#666666",
  border: "#E8E8E8",
  tabInactive: "#999999",
};

const W = 1080;
const H = 1920;

function ensureDir() {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Alt sekme çubuğu: Keşfet, Mesajlar, Beğenilenler, Profil */
function tabBar(activeIndex) {
  const labels = ["Keşfet", "Mesajlar", "Beğenilenler", "Profil"];
  const icons = ["○", "◉", "♥", "☺"];
  const x0 = 40;
  const gap = (W - 80) / 4;
  let parts = "";
  for (let i = 0; i < 4; i++) {
    const x = x0 + gap * i + gap / 2;
    const active = i === activeIndex;
    const col = active ? C.primary : C.tabInactive;
    parts += `<text x="${x}" y="1865" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="22" fill="${col}" font-weight="${active ? "700" : "400"}">${esc(labels[i])}</text>`;
    parts += `<text x="${x}" y="1825" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="28" fill="${col}">${icons[i]}</text>`;
  }
  return `<rect x="0" y="1760" width="${W}" height="160" fill="${C.surface}" stroke="${C.border}"/>
${parts}`;
}

function statusBar() {
  return `<rect x="0" y="0" width="${W}" height="52" fill="${C.surface}"/>
<text x="48" y="36" font-family="Segoe UI,Arial,sans-serif" font-size="26" fill="${C.text}">9:41</text>
<text x="${W - 48}" y="36" text-anchor="end" font-family="Segoe UI,Arial,sans-serif" font-size="22" fill="${C.muted}">LTE 🔋</text>`;
}

let _badgeSeq = 0;
function premiumBadge(x, y, w = 200) {
  const id = `pb${++_badgeSeq}`;
  return `<defs>
  <linearGradient id="${id}g" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" style="stop-color:${C.gold}"/>
    <stop offset="100%" style="stop-color:${C.goldDark}"/>
  </linearGradient>
</defs>
<rect x="${x}" y="${y}" rx="20" ry="20" width="${w}" height="44" fill="url(#${id}g)"/>
<text x="${x + w / 2}" y="${y + 30}" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="22" font-weight="700" fill="#1a1a1a">PREMIUM</text>`;
}

async function screenLogin(logoBuf) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="hdr" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${C.primary}"/>
      <stop offset="100%" style="stop-color:${C.primary2}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  ${statusBar()}
  <rect x="0" y="52" width="${W}" height="420" fill="url(#hdr)"/>
  <text x="${W / 2}" y="200" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="42" font-weight="700" fill="#ffffff">Giriş yap</text>
  <text x="${W / 2}" y="260" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="24" fill="#ffffff" opacity="0.95">Hesabına devam et</text>
  <rect x="64" y="520" width="${W - 128}" height="110" rx="16" fill="${C.surface}" stroke="${C.border}"/>
  <text x="96" y="575" font-family="Segoe UI,Arial,sans-serif" font-size="24" fill="${C.muted}">E-posta</text>
  <rect x="64" y="660" width="${W - 128}" height="110" rx="16" fill="${C.surface}" stroke="${C.border}"/>
  <text x="96" y="715" font-family="Segoe UI,Arial,sans-serif" font-size="24" fill="${C.muted}">••••••••</text>
  <rect x="64" y="820" width="${W - 128}" height="100" rx="50" fill="${C.primary}"/>
  <text x="${W / 2}" y="885" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="30" font-weight="600" fill="#ffffff">Giriş yap</text>
  <rect x="64" y="960" width="${W - 128}" height="96" rx="48" fill="${C.surface}" stroke="${C.border}"/>
  <text x="${W / 2}" y="1020" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="26" fill="${C.text}">Google ile devam et</text>
  ${premiumBadge(W / 2 - 130, 1120, 260)}
  <text x="${W / 2}" y="1210" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="22" fill="${C.muted}">Premium ile sınırsız mesaj ve filtreler</text>
</svg>`;
  return compositeSvgWithLogo(svg, logoBuf, W / 2 - 70, 100, 140, 140);
}

async function screenExplore(logoBuf) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  ${statusBar()}
  <rect x="0" y="52" width="${W}" height="120" fill="${C.surface}"/>
  <text x="48" y="130" font-family="Segoe UI,Arial,sans-serif" font-size="40" font-weight="700" fill="${C.text}">Keşfet</text>
  <rect x="48" y="200" width="${W - 96}" height="72" rx="36" fill="${C.surface}" stroke="${C.border}"/>
  <text x="100" y="248" font-family="Segoe UI,Arial,sans-serif" font-size="26" fill="${C.muted}">🔍 Konum, yaş ve ilgi alanlarında ara</text>
  <text x="48" y="330" font-family="Segoe UI,Arial,sans-serif" font-size="24" fill="${C.text}">Filtreler</text>
  ${premiumBadge(200, 350, 200)}
  <text x="48" y="430" font-family="Segoe UI,Arial,sans-serif" font-size="20" fill="${C.muted}">Gelişmiş filtreler Premium üyelere özel</text>
  <rect x="48" y="480" width="${W - 96}" height="220" rx="20" fill="${C.surface}" stroke="${C.border}"/>
  <circle cx="140" cy="590" r="56" fill="#ddd"/>
  <text x="240" y="560" font-family="Segoe UI,Arial,sans-serif" font-size="30" font-weight="600" fill="${C.text}">Ayşe, 28</text>
  <text x="240" y="610" font-family="Segoe UI,Arial,sans-serif" font-size="22" fill="${C.muted}">3 km · İstanbul</text>
  <rect x="48" y="730" width="${W - 96}" height="220" rx="20" fill="${C.surface}" stroke="${C.border}"/>
  <circle cx="140" cy="840" r="56" fill="#ddd"/>
  <text x="240" y="810" font-family="Segoe UI,Arial,sans-serif" font-size="30" font-weight="600" fill="${C.text}">Mehmet, 31</text>
  <text x="240" y="860" font-family="Segoe UI,Arial,sans-serif" font-size="22" fill="${C.muted}">Premium öne çıkan</text>
  <rect x="${W - 200}" y="780" width="140" height="40" rx="8" fill="${C.goldLight}" stroke="${C.gold}"/>
  <text x="${W - 130}" y="808" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="18" font-weight="700" fill="${C.goldDark}">ÖNE ÇIKAN</text>
  ${tabBar(0)}
</svg>`;
  return compositeSvgWithLogo(svg, logoBuf, 48, 60, 56, 56);
}

async function screenMessages(logoBuf) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  ${statusBar()}
  <rect x="0" y="52" width="${W}" height="120" fill="${C.surface}"/>
  <text x="48" y="130" font-family="Segoe UI,Arial,sans-serif" font-size="40" font-weight="700" fill="${C.text}">Mesajlar</text>
  <rect x="48" y="200" width="${W - 96}" height="140" rx="16" fill="${C.surface}" stroke="${C.border}"/>
  <circle cx="120" cy="270" r="48" fill="#ccc"/>
  <text x="200" y="250" font-family="Segoe UI,Arial,sans-serif" font-size="28" font-weight="600" fill="${C.text}">Selin</text>
  <text x="200" y="295" font-family="Segoe UI,Arial,sans-serif" font-size="22" fill="${C.muted}">Yarın buluşalım mı? 😊</text>
  <text x="${W - 80}" y="250" text-anchor="end" font-family="Segoe UI,Arial,sans-serif" font-size="20" fill="${C.muted}">12:04</text>
  <rect x="48" y="360" width="${W - 96}" height="140" rx="16" fill="${C.surface}" stroke="${C.border}"/>
  <circle cx="120" cy="430" r="48" fill="#ccc"/>
  <text x="200" y="410" font-family="Segoe UI,Arial,sans-serif" font-size="28" font-weight="600" fill="${C.text}">Can</text>
  <text x="200" y="455" font-family="Segoe UI,Arial,sans-serif" font-size="22" fill="${C.muted}">Merhaba, nasılsın?</text>
  <rect x="48" y="520" width="${W - 96}" height="140" rx="16" fill="${C.surface}" stroke="${C.border}"/>
  <circle cx="120" cy="590" r="48" fill="#ccc"/>
  <text x="200" y="570" font-family="Segoe UI,Arial,sans-serif" font-size="28" font-weight="600" fill="${C.text}">Deniz</text>
  <text x="200" y="615" font-family="Segoe UI,Arial,sans-serif" font-size="22" fill="${C.muted}">Fotoğraf gönderdi</text>
  <rect x="48" y="700" width="${W - 96}" height="100" rx="16" fill="${C.goldLight}" stroke="${C.gold}"/>
  <text x="80" y="760" font-family="Segoe UI,Arial,sans-serif" font-size="24" font-weight="600" fill="${C.goldDark}">★ Premium: Sınırsız mesaj ve okundu bilgisi</text>
  ${tabBar(1)}
</svg>`;
  return compositeSvgWithLogo(svg, logoBuf, 48, 60, 56, 56);
}

async function screenLikes(logoBuf) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="blurz" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#e0e0e0"/>
      <stop offset="100%" style="stop-color:#bdbdbd"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  ${statusBar()}
  <rect x="0" y="52" width="${W}" height="120" fill="${C.surface}"/>
  <text x="48" y="130" font-family="Segoe UI,Arial,sans-serif" font-size="40" font-weight="700" fill="${C.text}">Beğenilenler</text>
  <text x="48" y="200" font-family="Segoe UI,Arial,sans-serif" font-size="24" fill="${C.muted}">Gönderilen ve alınan beğeniler</text>
  <rect x="48" y="240" width="${W - 96}" height="420" rx="24" fill="url(#blurz)" stroke="${C.border}"/>
  <text x="${W / 2}" y="420" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="28" fill="${C.muted}">Profil bulanık</text>
  ${premiumBadge(W / 2 - 100, 460, 200)}
  <text x="${W / 2}" y="560" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="24" fill="${C.text}">Bilgileri görmek için Premium</text>
  <rect x="48" y="720" width="${W - 96}" height="200" rx="20" fill="${C.surface}" stroke="${C.accent}" stroke-width="3"/>
  <circle cx="140" cy="820" r="56" fill="#f8b"/>
  <text x="240" y="800" font-family="Segoe UI,Arial,sans-serif" font-size="30" font-weight="600" fill="${C.text}">Premium üye önizlemesi</text>
  <text x="240" y="850" font-family="Segoe UI,Arial,sans-serif" font-size="22" fill="${C.muted}">Net fotoğraf ve mesaj</text>
  <rect x="48" y="980" width="${W - 96}" height="88" rx="44" fill="${C.accent}"/>
  <text x="${W / 2}" y="1035" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="28" font-weight="700" fill="#ffffff">Premium’a geç</text>
  ${tabBar(2)}
</svg>`;
  return compositeSvgWithLogo(svg, logoBuf, 48, 60, 56, 56);
}

async function screenSettings(logoBuf) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  ${statusBar()}
  <rect x="0" y="52" width="${W}" height="120" fill="${C.surface}"/>
  <text x="48" y="130" font-family="Segoe UI,Arial,sans-serif" font-size="40" font-weight="700" fill="${C.text}">Ayarlar</text>
  <rect x="48" y="200" width="${W - 96}" height="88" rx="16" fill="${C.surface}" stroke="${C.border}"/>
  <text x="80" y="258" font-family="Segoe UI,Arial,sans-serif" font-size="28" fill="${C.text}">Dil · Türkçe</text>
  <text x="${W - 80}" y="258" text-anchor="end" font-family="Segoe UI,Arial,sans-serif" font-size="28" fill="${C.muted}">›</text>
  <rect x="48" y="310" width="${W - 96}" height="88" rx="16" fill="${C.surface}" stroke="${C.border}"/>
  <text x="80" y="368" font-family="Segoe UI,Arial,sans-serif" font-size="28" fill="${C.text}">Tema</text>
  <text x="${W - 80}" y="368" text-anchor="end" font-family="Segoe UI,Arial,sans-serif" font-size="28" fill="${C.muted}">›</text>
  <rect x="48" y="420" width="${W - 96}" height="120" rx="16" fill="${C.goldLight}" stroke="${C.gold}" stroke-width="3"/>
  <text x="80" y="475" font-family="Segoe UI,Arial,sans-serif" font-size="30" font-weight="700" fill="${C.goldDark}">★ Premium mağaza</text>
  <text x="80" y="515" font-family="Segoe UI,Arial,sans-serif" font-size="22" fill="${C.muted}">Sınırsız mesaj, filtreler, net profiller</text>
  <text x="${W - 80}" y="490" text-anchor="end" font-family="Segoe UI,Arial,sans-serif" font-size="28" fill="${C.goldDark}">›</text>
  <rect x="48" y="570" width="${W - 96}" height="88" rx="16" fill="${C.surface}" stroke="${C.border}"/>
  <text x="80" y="628" font-family="Segoe UI,Arial,sans-serif" font-size="28" fill="${C.text}">Bildirimler</text>
  <text x="${W - 80}" y="628" text-anchor="end" font-family="Segoe UI,Arial,sans-serif" font-size="28" fill="${C.muted}">›</text>
  <rect x="48" y="680" width="${W - 96}" height="88" rx="16" fill="${C.surface}" stroke="${C.border}"/>
  <text x="80" y="738" font-family="Segoe UI,Arial,sans-serif" font-size="28" fill="${C.text}">Gizlilik ve güvenlik</text>
  <text x="${W - 80}" y="738" text-anchor="end" font-family="Segoe UI,Arial,sans-serif" font-size="28" fill="${C.muted}">›</text>
  <rect x="48" y="800" width="${W - 96}" height="88" rx="16" fill="${C.surface}" stroke="${C.border}"/>
  <text x="80" y="858" font-family="Segoe UI,Arial,sans-serif" font-size="28" fill="#E74C3C">Çıkış yap</text>
  ${tabBar(3)}
</svg>`;
  return compositeSvgWithLogo(svg, logoBuf, 48, 60, 56, 56);
}

async function compositeSvgWithLogo(svg, logoPng, lx, ly, lw, lh) {
  const base = await sharp(Buffer.from(svg, "utf8")).png().toBuffer();
  const resized = await sharp(logoPng).resize(lw, lh, { fit: "inside" }).toBuffer();
  return sharp(base).composite([{ input: resized, left: lx, top: ly }]).png().toBuffer();
}

async function makeFeatureGraphic(logoBuf) {
  const logo = await sharp(logoBuf).resize(200, 200, { fit: "inside" }).toBuffer();
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${C.primary}"/>
      <stop offset="50%" style="stop-color:${C.primary2}"/>
      <stop offset="100%" style="stop-color:${C.accent}"/>
    </linearGradient>
    <linearGradient id="goldfg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${C.gold}"/>
      <stop offset="100%" style="stop-color:${C.goldDark}"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="500" fill="url(#fg)"/>
  <text x="720" y="200" font-family="Segoe UI,Arial,sans-serif" font-size="52" font-weight="700" fill="#ffffff">herio</text>
  <text x="720" y="270" font-family="Segoe UI,Arial,sans-serif" font-size="26" fill="#ffffff" opacity="0.95">Keşfet · Mesajlar · Beğeniler · Ayarlar</text>
  <rect x="720" y="310" rx="24" ry="24" width="240" height="52" fill="url(#goldfg)"/>
  <text x="840" y="345" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="22" font-weight="700" fill="#1a1a1a">PREMIUM</text>
  <text x="720" y="400" font-family="Segoe UI,Arial,sans-serif" font-size="20" fill="#ffffff" opacity="0.9">Filtreler · Sınırsız mesaj · Net profiller</text>
</svg>`;
  const base = await sharp(Buffer.from(svg, "utf8")).png().toBuffer();
  await sharp(base)
    .composite([{ input: logo, left: 80, top: 150 }])
    .png()
    .toFile(join(outDir, "feature-graphic-1024x500.png"));
}

async function makeIcon512() {
  await sharp(iconPath)
    .resize(512, 512, { fit: "cover", position: "centre" })
    .png()
    .toFile(join(outDir, "play-store-icon-512.png"));
}

async function main() {
  if (!existsSync(logoPath) || !existsSync(iconPath)) {
    console.error("Missing logo or icon");
    process.exit(1);
  }
  ensureDir();
  const logoBuf = readFileSync(logoPath);

  const screens = [
    { name: "phone-screenshot-01-login", fn: screenLogin },
    { name: "phone-screenshot-02-kesfet", fn: screenExplore },
    { name: "phone-screenshot-03-mesajlar", fn: screenMessages },
    { name: "phone-screenshot-04-begenilenler", fn: screenLikes },
    { name: "phone-screenshot-05-ayarlar", fn: screenSettings },
  ];

  for (const { name, fn } of screens) {
    _badgeSeq = 0;
    const png = await fn(logoBuf);
    await sharp(png).toFile(join(outDir, `${name}.png`));
    console.log("OK", name + ".png");
  }

  await makeFeatureGraphic(logoBuf);
  console.log("OK feature-graphic-1024x500.png");

  await makeIcon512();
  console.log("OK play-store-icon-512.png");

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
