/**
 * Fetches hardcoded remote photos used in the app, converts to PNG, writes to public/images/slots/.
 * Run from greenzone-bolt: npm run images:slots
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'images', 'slots');

/** Higher-res fetch where the CDN allows it; output is normalized to PNG. */
const SLOTS = [
  {
    file: 'product-placeholder.png',
    url: 'https://images.pexels.com/photos/7262757/pexels-photo-7262757.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    file: 'checkout-sample-1.png',
    url: 'https://images.pexels.com/photos/7148942/pexels-photo-7148942.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    file: 'checkout-sample-2.png',
    // Original Pexels 7195950 no longer resolves; same role (second mock line item).
    url: 'https://images.pexels.com/photos/4021779/pexels-photo-4021779.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    file: 'checkout-confirm-logo.png',
    url: 'https://images.pexels.com/photos/1089842/pexels-photo-1089842.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
];

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  for (const { file, url } of SLOTS) {
    const dest = path.join(OUT_DIR, file);
    process.stdout.write(`Fetching ${url.slice(0, 64)}…\n`);
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await sharp(buf).png({ compressionLevel: 9 }).toFile(dest);
    process.stdout.write(`Wrote ${path.relative(path.join(__dirname, '..'), dest)}\n`);
  }
  process.stdout.write('Done.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
