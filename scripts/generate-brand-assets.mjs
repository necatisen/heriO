/**
 * Generates every Birthchat icon / splash asset from assets/images/birthchat-logo-source.jpg.
 * Run: node scripts/generate-brand-assets.mjs
 */
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "assets/images/birthchat-logo-source.jpg");
const res = join(root, "android/app/src/main/res");
const BG = "#0f1330"; // logo background
const SPLASH_BG = "#FFFFFF";
const HEART_COLOR = "#FF4D6D";
const HEART_DP = 56; // must match the startup HeartLoader size

const meta = await sharp(src).metadata();
const S = meta.width; // square source
// Crop around the neon tile (centre of the artwork), used for square icons.
const tileCrop = (frac) => {
  const size = Math.round(S * frac);
  const left = Math.round((S - size) / 2);
  const top = Math.round((S - size) / 2 - S * 0.012);
  return { left, top: Math.max(0, top), width: size, height: size };
};

const out = async (rel, pipeline) => {
  const p = join(root, rel);
  mkdirSync(dirname(p), { recursive: true });
  await pipeline.png().toFile(p);
  console.log("wrote", rel);
};

// Square icons (Expo icon, store icon, legacy launcher)
const square = (size, frac = 0.78) => sharp(src).extract(tileCrop(frac)).resize(size, size);
await out("assets/icon.png", square(1024));
await out("assets/images/app-icon.png", square(1024));
await out("assets/images/birthchat-icon.png", square(1024));
await out("store/google-play/play-store-icon-512.png", square(512));
await out("assets/images/favicon.png", square(196));

// Android launcher icons
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, m] of Object.entries(densities)) {
  const legacy = Math.round(48 * m);
  await out(`android/app/src/main/res/mipmap-${d}/ic_launcher.png`, square(legacy));
  // Rounded legacy icon for launchers that use roundIcon
  const r = legacy / 2;
  const circle = Buffer.from(`<svg width="${legacy}" height="${legacy}"><circle cx="${r}" cy="${r}" r="${r}"/></svg>`);
  await out(
    `android/app/src/main/res/mipmap-${d}/ic_launcher_round.png`,
    sharp(await square(legacy).png().toBuffer()).composite([{ input: circle, blend: "dest-in" }])
  );
  // Adaptive foreground: whole artwork, slightly zoomed, on a 108dp canvas.
  const fg = Math.round(108 * m);
  const zoom = Math.round(fg * 1.06);
  const off = Math.round((zoom - fg) / 2);
  await out(
    `android/app/src/main/res/mipmap-${d}/ic_launcher_foreground.png`,
    sharp(src).resize(zoom, zoom).extract({ left: off, top: off, width: fg, height: fg })
  );
}
writeFileSync(
  join(res, "mipmap-anydpi-v26/ic_launcher.xml"),
  `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n  <background android:drawable="@color/iconBackground"/>\n  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n`
);
writeFileSync(
  join(res, "mipmap-anydpi-v26/ic_launcher_round.xml"),
  `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n  <background android:drawable="@color/iconBackground"/>\n  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n`
);
console.log("wrote mipmap-anydpi-v26 adaptive icons");

// Splash: small heart (same as the in-app HeartLoader) centred on a 288dp canvas,
// so Android 12+ shows it at HEART_DP instead of filling the splash circle.
const heartPath =
  "M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5";
const splashSvg = (px) => {
  const heart = (HEART_DP / 288) * px;
  const scale = heart / 24;
  const o = (px - heart) / 2;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}"><g transform="translate(${o} ${o}) scale(${scale})"><path d="${heartPath}" fill="${HEART_COLOR}" stroke="${HEART_COLOR}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`
  );
};
const splashTargets = { drawable: 288, "drawable-mdpi": 288, "drawable-hdpi": 432, "drawable-xhdpi": 576, "drawable-xxhdpi": 864, "drawable-xxxhdpi": 1152 };
for (const [dir, px] of Object.entries(splashTargets)) {
  await out(`android/app/src/main/res/${dir}/splashscreen_logo.png`, sharp(splashSvg(px)));
}
await out("assets/images/splash-heart.png", sharp(splashSvg(1152)));

console.log(`\nUse in colors.xml: iconBackground=${BG}, splashscreen_background=${SPLASH_BG}`);

// Notification icon: Android only uses the alpha channel, so a white heart silhouette.
const notifSvg = (px) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 24 24"><path d="${heartPath}" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/></svg>`
  );
for (const [d, m] of Object.entries(densities)) {
  await out(`android/app/src/main/res/drawable-${d}/notification_icon.png`, sharp(notifSvg(Math.round(24 * m))));
}
await out("assets/images/notification-icon.png", sharp(notifSvg(96)));

// Google Play feature graphic (1024x500): night gradient, glow orbs, icon + wordmark.
{
  const W = 1024, H = 500;
  const icon = await sharp(src).extract(tileCrop(0.78)).resize(300, 300).png().toBuffer();
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF7A59"/><stop offset="0.55" stop-color="#FF4F8B"/><stop offset="1" stop-color="#B455F5"/></linearGradient>
    <radialGradient id="o1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.25"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
    <radialGradient id="o2"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.18"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
    <linearGradient id="tx" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#FFFFFF"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="150" cy="120" r="320" fill="url(#o1)"/>
  <circle cx="930" cy="430" r="300" fill="url(#o2)"/>
  <text x="400" y="235" font-family="Segoe UI,Arial,sans-serif" font-size="84" font-weight="800" fill="url(#tx)">Birthchat</text>
  <text x="404" y="300" font-family="Segoe UI,Arial,sans-serif" font-size="27" fill="#FFFFFF" opacity="0.85">Real people · Smart matches · Safe chat</text>
</svg>`);
  await out("store/google-play/feature-graphic-1024x500.png", sharp(svg).composite([{ input: icon, left: 60, top: 100 }]));
}
