/**
 * Resize homepage banner art to the Smokers Club strip aspect (~6:1) so it fills the slot without tiny letterboxing.
 * Run: node scripts/build-smokers-club-strip-banners.mjs
 * Outputs: public/banners/smokers-club-strip/*.png
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'public', 'banners', 'smokers-club-strip');
const homepageDir = path.join(root, 'public', 'banners', 'homepage');
const fallbackDir = path.join(root, 'public', 'banners', 'fallback');

/** Matches ~max-w-3xl × ~128px slot at 2× DPR. */
const STRIP_WIDTH = 1440;
const STRIP_HEIGHT = 240;

const jobs = [
  { name: 'uncle-green-grand-opening.png', from: homepageDir },
  { name: 'uncle-green-free-gift.png', from: homepageDir },
  { name: 'super-fresh-farms-split-ounce.png', from: homepageDir },
  { name: 'green-haven-banner.png', from: homepageDir },
  { name: 'stiiizy-sponsored.png', from: fallbackDir },
];

fs.mkdirSync(outDir, { recursive: true });

for (const { name, from } of jobs) {
  const input = path.join(from, name);
  const output = path.join(outDir, name);
  if (!fs.existsSync(input)) {
    console.warn(`[skip] missing source: ${input}`);
    continue;
  }
  await sharp(input)
    .resize(STRIP_WIDTH, STRIP_HEIGHT, { fit: 'cover', position: 'centre' })
    .png({ compressionLevel: 9 })
    .toFile(output);
  console.log(`[ok] ${path.relative(root, output)}`);
}
