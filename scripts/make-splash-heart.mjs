/**
 * Creates a heart splash image at assets/images/splash-heart.png
 * Run: node scripts/make-splash-heart.mjs
 */
import sharp from "sharp";
import { mkdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "assets", "images");
const outPath = join(outDir, "splash-heart.png");

mkdirSync(outDir, { recursive: true });

const W = 1024;
const H = 1024;
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="220" fill="#FFFFFF"/>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FF6B9D"/>
      <stop offset="1" stop-color="#C44569"/>
    </linearGradient>
  </defs>
  <path d="M512 840s-276-170-276-392c0-104 76-188 170-188 63 0 118 35 146 86 28-51 83-86 146-86 94 0 170 84 170 188 0 222-276 392-276 392z" fill="url(#g)"/>
  <path d="M512 806s-246-152-246-352c0-89 64-161 144-161 64 0 120 48 140 106 20-58 76-106 140-106 80 0 144 72 144 161 0 200-246 352-246 352z" fill="rgba(255,255,255,0.18)"/>
</svg>`;

await sharp(Buffer.from(svg, "utf8")).png().toFile(outPath);
const meta = await sharp(outPath).metadata();
console.log("wrote", outPath, meta.format, `${meta.width}x${meta.height}`);

