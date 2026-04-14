/**
 * Rasterize SVG layouts to PNG under public/ — matches paths in supabase migrations (0149, 0150, 0160).
 * Requires devDependency `sharp`. Run from repo: `node scripts/write-homepage-banner-placeholders.mjs`
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function writeBanner(filename, bgHex, title, subtitle) {
  const svg = `<svg width="1200" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="400" fill="${bgHex}"/>
  <rect x="48" y="48" width="1104" height="304" rx="20" fill="rgba(0,0,0,0.28)"/>
  <text x="600" y="185" text-anchor="middle" fill="#fafafa" font-family="system-ui,Segoe UI,sans-serif" font-size="40" font-weight="700">${escapeXml(
    title
  )}</text>
  <text x="600" y="250" text-anchor="middle" fill="#d4d4d8" font-family="system-ui,Segoe UI,sans-serif" font-size="24">${escapeXml(
    subtitle
  )}</text>
</svg>`;
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  const out = path.join(publicDir, 'banners', 'homepage', filename);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
}

/** Must match DATREEHOUSE_LOGO_PX_* in lib/treehouseCarouselAsset.ts */
const LOGO_W = 400;
const LOGO_H = 80;

async function writeLogo() {
  const svg = `<svg width="${LOGO_W}" height="${LOGO_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#14532d"/>
      <stop offset="100%" style="stop-color:#052e16"/>
    </linearGradient>
  </defs>
  <rect width="${LOGO_W}" height="${LOGO_H}" rx="18" fill="url(#g)"/>
  <g transform="translate(40,40)">
    <circle cx="0" cy="0" r="26" fill="rgba(0,0,0,0.2)"/>
    <path d="M0 -20 L16 10 L-16 10 Z" fill="#bef264"/>
    <rect x="-4" y="10" width="8" height="14" fill="#86efac" rx="2"/>
  </g>
  <text x="92" y="52" fill="#ecfccb" font-family="system-ui,Segoe UI,sans-serif" font-size="24" font-weight="700">Da Treehouse</text>
</svg>`;
  const dir = path.join(publicDir, 'brand');
  fs.mkdirSync(dir, { recursive: true });
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  fs.writeFileSync(path.join(dir, 'datreehouse-logo.png'), buf);
}

// Final brand art can stay committed; if missing (fresh clone), generate so carousel fallbacks verify.
const logoPath = path.join(publicDir, 'brand', 'datreehouse-logo.png');
if (process.env.OVERWRITE_BRAND_LOGO === '1' || !fs.existsSync(logoPath)) {
  await writeLogo();
}
await writeBanner('uncle-green-grand-opening.png', '#166534', 'Uncle Green', 'Grand opening — homepage banner');
await writeBanner('uncle-green-free-gift.png', '#365314', 'Uncle Green', 'Free gift — homepage banner');
await writeBanner('super-fresh-farms-split-ounce.png', '#047857', 'Super Fresh Farms', 'Split ounce — homepage banner');
await writeBanner('green-haven-banner.png', '#1e3a2f', 'Green Haven', 'Homepage banner');
await writeBanner('stiiizy-homepage.png', '#9a3412', 'STIIIZY', 'Homepage hero — partner banner');

console.log('OK: ensured public/brand/datreehouse-logo.png and public/banners/homepage/*.png');
