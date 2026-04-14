/**
 * Backfill: download strain encyclopedia + brand + catalog_products remote image URLs,
 * convert to PNG, upload to storage bucket `mirrored-images`, update DB rows.
 *
 * Prerequisite: apply supabase/migrations/0103_storage_mirrored_images_bucket.sql
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY
 *
 *   node scripts/mirror-encyclopedia-assets.mjs
 *   node scripts/mirror-encyclopedia-assets.mjs --strains-only
 *   node scripts/mirror-encyclopedia-assets.mjs --brands-only
 *   node scripts/mirror-encyclopedia-assets.mjs --catalog-only
 *   node scripts/mirror-encyclopedia-assets.mjs --brands-and-strains-only   (skip catalog_products)
 *   node scripts/mirror-encyclopedia-assets.mjs --force   (re-fetch even if URL already on mirrored-images)
 *   node scripts/mirror-encyclopedia-assets.mjs --limit=50   (dev: cap rows per table)
 */

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import {
  isAlreadyMirrored,
  mirrorRemoteToStorage,
  normalizeRemoteImageUrl,
} from './lib/mirrorImageToStorage.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(p) {
  if (!fs.existsSync(p)) return;
  const raw = fs.readFileSync(p, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

const strainsOnly = process.argv.includes('--strains-only');
const brandsOnly = process.argv.includes('--brands-only');
const catalogOnly = process.argv.includes('--catalog-only');
const brandsAndStrainsOnly = process.argv.includes('--brands-and-strains-only');
const forceRemirror = process.argv.includes('--force');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const rowLimit = limitArg ? Math.max(1, Number.parseInt(limitArg.split('=')[1], 10) || 0) : 0;

function wantStrains() {
  if (catalogOnly) return false;
  if (brandsOnly) return false;
  if (strainsOnly || brandsAndStrainsOnly) return true;
  return true;
}
function wantBrands() {
  if (catalogOnly) return false;
  if (strainsOnly) return false;
  if (brandsOnly || brandsAndStrainsOnly) return true;
  return true;
}
function wantCatalog() {
  if (catalogOnly) return true;
  if (strainsOnly || brandsOnly || brandsAndStrainsOnly) return false;
  return true;
}

async function mirrorStrains(supabase, baseUrl, urlCache, maxRows, force) {
  const pageSize = 120;
  let from = 0;
  let touched = 0;
  let scanned = 0;
  for (;;) {
    if (maxRows && scanned >= maxRows) break;
    const take = maxRows ? Math.min(pageSize, maxRows - scanned) : pageSize;
    const { data, error } = await supabase
      .from('strains')
      .select('id,image_url')
      .not('image_url', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + take - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) {
      scanned++;
      if (maxRows && scanned > maxRows) break;
      const orig = String(row.image_url || '').trim();
      const u = normalizeRemoteImageUrl(orig);
      if (!u || !/^https?:\/\//i.test(u)) continue;
      if (!force && isAlreadyMirrored(u, baseUrl)) continue;
      const objectPath = `strains/${row.id}.png`;
      const next = await mirrorRemoteToStorage(supabase, baseUrl, orig, objectPath, { urlCache, force });
      if (next !== orig) {
        const { error: uErr } = await supabase.from('strains').update({ image_url: next }).eq('id', row.id);
        if (uErr) console.warn('strains update', row.id, uErr.message);
        else touched++;
      }
    }
    if (data.length < take) break;
    from += take;
  }
  console.log(`strains: scanned≈${scanned}, mirrored updates=${touched}`);
}

async function mirrorBrands(supabase, baseUrl, urlCache, maxRows, force) {
  const pageSize = 120;
  let from = 0;
  let touched = 0;
  let scanned = 0;
  for (;;) {
    if (maxRows && scanned >= maxRows) break;
    const take = maxRows ? Math.min(pageSize, maxRows - scanned) : pageSize;
    const { data, error } = await supabase
      .from('brands')
      .select('id,logo_url')
      .not('logo_url', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + take - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) {
      scanned++;
      if (maxRows && scanned > maxRows) break;
      const orig = String(row.logo_url || '').trim();
      const u = normalizeRemoteImageUrl(orig);
      if (!u || !/^https?:\/\//i.test(u)) continue;
      if (!force && isAlreadyMirrored(u, baseUrl)) continue;
      const objectPath = `brands/${row.id}.png`;
      const next = await mirrorRemoteToStorage(supabase, baseUrl, orig, objectPath, { urlCache, force });
      if (next !== orig) {
        const { error: uErr } = await supabase.from('brands').update({ logo_url: next }).eq('id', row.id);
        if (uErr) console.warn('brands update', row.id, uErr.message);
        else touched++;
      }
    }
    if (data.length < take) break;
    from += take;
  }
  console.log(`brands: scanned≈${scanned}, mirrored updates=${touched}`);
}

async function mirrorCatalogProducts(supabase, baseUrl, urlCache, maxRows, force) {
  const pageSize = 100;
  let from = 0;
  let touched = 0;
  let scanned = 0;
  console.log('catalog_products: mirroring (progress every 25 rows)…');
  for (;;) {
    if (maxRows && scanned >= maxRows) break;
    const take = maxRows ? Math.min(pageSize, maxRows - scanned) : pageSize;
    const { data, error } = await supabase
      .from('catalog_products')
      .select('id,images')
      .order('id', { ascending: true })
      .range(from, from + take - 1);
    if (error) {
      if (String(error.message || '').includes('does not exist')) {
        console.log('catalog_products: table missing, skip.');
        return;
      }
      throw error;
    }
    if (!data?.length) break;
    for (const row of data) {
      scanned++;
      if (scanned % 25 === 0) process.stdout.write(`\r  catalog_products scanned ${scanned}, rows updated ${touched}…`);
      if (maxRows && scanned > maxRows) break;
      const imgs = Array.isArray(row.images) ? row.images.map((x) => String(x || '').trim()).filter(Boolean) : [];
      if (!imgs.length) continue;
      let changed = false;
      const next = [];
      for (let i = 0; i < imgs.length; i++) {
        const orig = imgs[i];
        const u = normalizeRemoteImageUrl(orig);
        if (!u || !/^https?:\/\//i.test(u)) {
          next.push(orig);
          continue;
        }
        if (!force && isAlreadyMirrored(u, baseUrl)) {
          next.push(orig);
          continue;
        }
        const objectPath = `catalog-products/${row.id}_${i}.png`;
        const mirrored = await mirrorRemoteToStorage(supabase, baseUrl, orig, objectPath, { urlCache, force });
        next.push(mirrored);
        if (mirrored !== orig) changed = true;
      }
      if (changed) {
        const { error: uErr } = await supabase.from('catalog_products').update({ images: next }).eq('id', row.id);
        if (uErr) console.warn('catalog_products update', row.id, uErr.message);
        else touched++;
      }
    }
    if (data.length < take) break;
    from += take;
  }
  process.stdout.write('\r');
  console.log(`catalog_products: scanned≈${scanned}, rows updated=${touched}`);
}

async function main() {
  loadEnvFile(path.join(__dirname, '..', '.env.local'));
  loadEnvFile(path.join(__dirname, '..', '.env'));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const urlCache = new Map();

  const max = rowLimit || 0;
  if (wantStrains()) await mirrorStrains(supabase, url, urlCache, max, forceRemirror);
  if (wantBrands()) await mirrorBrands(supabase, url, urlCache, max, forceRemirror);
  if (wantCatalog()) await mirrorCatalogProducts(supabase, url, urlCache, max, forceRemirror);

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
