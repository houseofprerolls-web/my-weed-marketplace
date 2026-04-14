/**
 * Ensures static files exist for homepage hero paths used in SQL seeds (0149, 0150, 0160).
 * Run: node scripts/verify-homepage-banner-assets.mjs (from greenzone-bolt)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

const REQUIRED = [
  'brand/datreehouse-logo.png',
  'banners/homepage/uncle-green-grand-opening.png',
  'banners/homepage/uncle-green-free-gift.png',
  'banners/homepage/super-fresh-farms-split-ounce.png',
  'banners/homepage/green-haven-banner.png',
  'banners/homepage/stiiizy-homepage.png',
];

let failed = false;
for (const rel of REQUIRED) {
  const full = path.join(publicDir, rel);
  if (!fs.existsSync(full)) {
    console.error('MISSING:', rel);
    failed = true;
  } else {
    const st = fs.statSync(full);
    if (!st.isFile() || st.size < 32) {
      console.error('INVALID (empty or not a file):', rel);
      failed = true;
    }
  }
}

if (failed) {
  console.error('\nGenerate placeholders: npm run banners:write-placeholders');
  process.exit(1);
}

console.log('OK: all homepage banner + brand assets present under public/');
