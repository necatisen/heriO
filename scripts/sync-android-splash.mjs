/**
 * Overwrite Android splashscreen_logo.png in res/ with heart splash.
 * Run: node scripts/sync-android-splash.mjs
 */
import sharp from "sharp";
import { existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "assets", "images", "splash-heart.png");

if (!existsSync(src)) {
  console.error("Missing source:", src);
  process.exit(1);
}

const targets = [
  { rel: "android/app/src/main/res/drawable/splashscreen_logo.png", size: 288 },
  { rel: "android/app/src/main/res/drawable-mdpi/splashscreen_logo.png", size: 288 },
  { rel: "android/app/src/main/res/drawable-hdpi/splashscreen_logo.png", size: 432 },
  { rel: "android/app/src/main/res/drawable-xhdpi/splashscreen_logo.png", size: 576 },
  { rel: "android/app/src/main/res/drawable-xxhdpi/splashscreen_logo.png", size: 864 },
  { rel: "android/app/src/main/res/drawable-xxxhdpi/splashscreen_logo.png", size: 1152 },
];

for (const t of targets) {
  const out = join(root, t.rel);
  await sharp(src)
    .resize(t.size, t.size, { fit: "cover" })
    .png()
    .toFile(out);
  console.log("wrote", t.rel);
}

