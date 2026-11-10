// Bumps the app version in app.json and always increments android.versionCode.
// Usage: node scripts/bump-version.mjs [patch|minor|major]   (default: patch)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const appJsonPath = fileURLToPath(new URL('../app.json', import.meta.url));
const level = process.argv[2] ?? 'patch';
if (!['patch', 'minor', 'major'].includes(level)) {
  console.error(`Unknown level "${level}". Use patch, minor or major.`);
  process.exit(1);
}

const appJson = JSON.parse(readFileSync(appJsonPath, 'utf8'));
const expo = appJson.expo;
let [major, minor, patch] = expo.version.split('.').map(Number);

if (level === 'major') [major, minor, patch] = [major + 1, 0, 0];
else if (level === 'minor') [minor, patch] = [minor + 1, 0];
else patch += 1;

const oldVersion = `${expo.version} (${expo.android.versionCode})`;
expo.version = `${major}.${minor}.${patch}`;
expo.android.versionCode = (expo.android.versionCode ?? 0) + 1;

writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
console.log(`Version: ${oldVersion} -> ${expo.version} (${expo.android.versionCode})`);
