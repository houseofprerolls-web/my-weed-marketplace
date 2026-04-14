/**
 * Import Weedmaps-style menu CSV into public.brands + public.catalog_products
 * (vendor “Brand catalog” picker).
 *
 * Expected columns: product title, brand name, category, image, data3 (potency line).
 * Category mapping: BIG BUDS, SMALLS, FLOWER, etc. → flower | preroll | vape | edible | concentrate | topical | other
 *
 * Requires: migrations 0098_catalog_products_vendor_menu_pick.sql and 0100_catalog_products_reviews_and_rls.sql applied.
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (in .env or .env.local)
 *
 *   node scripts/import-catalog-csv.mjs "C:/path/to/export.csv"
 *   node scripts/import-catalog-csv.mjs "C:/path/to/export.csv" --dry-run
 *   node scripts/import-catalog-csv.mjs "C:/path/to/export.csv" --no-hq-image   (keep original WM thumb params)
 *   node scripts/import-catalog-csv.mjs "C:/path/to/export.csv" --no-mirror-images   (skip PNG upload to mirrored-images)
 *   node scripts/import-catalog-csv.mjs "C:/path/to/export.csv" --force-mirror       (re-fetch + re-upload even if URL already mirrored)
 *   node scripts/import-catalog-csv.mjs "C:/path/to/export.csv" --strict-mirror     (fail row if image fetch/upload fails)
 *
 * By default each product image URL is fetched, converted to PNG, and stored under bucket `mirrored-images`
 * (path catalog-import/{sha256}.png) so browsers load from your Supabase CDN.
 *
 * Duplicate rows (same brand_id + normalized product name) are skipped by default so re-imports
 * and overlapping CSVs are safe. Opt in to allow duplicates: --allow-duplicates
 *
 * Leafly (Octoparse) export: data=title, data2=THC line, data3=$price, data7=type (Cartridge/Edible/…),
 *   data8="by Brand", data9=CBD line, image=last column; $ also in data5/data15.
 *
 *   node scripts/import-catalog-csv.mjs "./scripts/fixtures/super-fresh-farms-leafly-menu.csv" --leafly
 *   node scripts/import-catalog-csv.mjs "./scripts/fixtures/super-fresh-farms-leafly-menu.csv" --leafly --vendor-slug=super-fresh-farms --replace-vendor-menu
 *
 * With --vendor-slug=, each row inserts catalog_products then a public.products row for that shop
 * (requires SUPABASE_SERVICE_ROLE_KEY). --replace-vendor-menu deletes existing products for the vendor first.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import { mirrorCatalogCsvImageUrl } from './lib/mirrorImageToStorage.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DRY = process.argv.includes('--dry-run');
const NO_HQ = process.argv.includes('--no-hq-image');
const ALLOW_DUPLICATES = process.argv.includes('--allow-duplicates');
const NO_MIRROR_IMAGES = process.argv.includes('--no-mirror-images');
const FORCE_MIRROR = process.argv.includes('--force-mirror');
const STRICT_MIRROR = process.argv.includes('--strict-mirror');
const LEAFLY = process.argv.includes('--leafly');
const REPLACE_VENDOR_MENU = process.argv.includes('--replace-vendor-menu');

function optArg(prefix) {
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length).trim() : '';
}

const VENDOR_SLUG = optArg('--vendor-slug=');

/** Weedmaps menu section → public.catalog_products.category */
const WM_TO_CATEGORY = {
  'BIG BUDS': 'flower',
  SMALLS: 'flower',
  FLOWER: 'flower',
  GROUND: 'flower',
  'INFUSED FLOWER': 'flower',
  JOINTS: 'preroll',
  'PRE-ROLLS': 'preroll',
  'INFUSED JOINTS': 'preroll',
  'INFUSED PRE-ROLLS': 'preroll',
  'INFUSED BLUNTS': 'preroll',
  BLUNTS: 'preroll',
  'INFUSED MINIS': 'preroll',
  MINIS: 'preroll',
  CARTRIDGE: 'vape',
  PODS: 'vape',
  'ALL-IN-ONE': 'vape',
  'VAPE PENS': 'vape',
  PULL: 'vape',
  'PUSH BUTTON': 'vape',
  BATTERIES: 'other',
  GUMMIES: 'edible',
  CHOCOLATES: 'edible',
  'BAKED GOODS': 'edible',
  EDIBLES: 'edible',
  MINTS: 'edible',
  SAUCE: 'concentrate',
  ROSIN: 'concentrate',
  BADDER: 'concentrate',
  'COLD CURE BADDER': 'concentrate',
  CRYSTALLINE: 'concentrate',
  'FRESH PRESS': 'concentrate',
  CONCENTRATES: 'concentrate',
};

function mapCategory(raw) {
  const k = (raw || '').trim().toUpperCase();
  return WM_TO_CATEGORY[k] || 'other';
}

/** Leafly menu “type” column (data9) → catalog category */
const LEAFLY_TYPE_TO_CATEGORY = {
  CARTRIDGE: 'vape',
  PODS: 'vape',
  'ALL-IN-ONE': 'vape',
  'VAPE PENS': 'vape',
  EDIBLE: 'edible',
  EDIBLES: 'edible',
  GUMMIES: 'edible',
  FLOWER: 'flower',
  'PRE-ROLL': 'preroll',
  'PRE-ROLLS': 'preroll',
  JOINTS: 'preroll',
  CONCENTRATE: 'concentrate',
  CONCENTRATES: 'concentrate',
  ROSIN: 'concentrate',
  TOPICAL: 'topical',
  BEVERAGE: 'edible',
  ACCESSORY: 'other',
};

function mapLeaflyCategory(raw) {
  const k = (raw || '').trim().toUpperCase();
  return LEAFLY_TYPE_TO_CATEGORY[k] || mapCategory(k);
}

function extractLeaflyPriceDollars(row) {
  for (const key of ['data3', 'data5', 'data15', 'data6', 'data7']) {
    const txt = col(row, key);
    const m = txt.match(/\$\s*([\d.]+)/);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

function leaflyBrandName(data10) {
  return String(data10 || '')
    .replace(/^by\s+/i, '')
    .trim();
}

function parseLeaflyPotency(data2, data8) {
  const t2 = String(data2 || '');
  const pctThc = t2.match(/THC\s*([\d.]+)\s*%/i);
  const t8 = String(data8 || '');
  const pctCbd = t8.match(/CBD\s*([\d.]+)\s*%/i);
  return {
    potency_thc: pctThc ? Number(pctThc[1]) : null,
    potency_cbd: pctCbd ? Number(pctCbd[1]) : null,
  };
}

function parseLeaflySaleDiscountPercent(data4) {
  const m = String(data4 || '').match(/(\d+)\s*%\s*off/i);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 1 || n > 99) return null;
  return n;
}

function col(row, name) {
  if (row[name] != null && row[name] !== '') return String(row[name]);
  const bom = `\ufeff${name}`;
  if (row[bom] != null && row[bom] !== '') return String(row[bom]);
  return '';
}

function slugify(s) {
  const base = String(s || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[®©™⭐Ⓡ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96);
  return base || 'brand';
}

function upgradeImageUrl(url) {
  if (NO_HQ || !url || !/^https?:\/\//i.test(url)) return url || '';
  try {
    const u = new URL(url);
    if (u.searchParams.has('w')) u.searchParams.set('w', '640');
    if (u.searchParams.has('h')) u.searchParams.set('h', '640');
    u.searchParams.delete('blur');
    return u.toString();
  } catch {
    return url;
  }
}

function parsePotency(data3) {
  const t = String(data3 || '');
  const thc = t.match(/([\d.]+)\s*%?\s*THC/i);
  const cbd = t.match(/([\d.]+)\s*%?\s*CBD/i);
  return {
    potency_thc: thc ? Number(thc[1]) : null,
    potency_cbd: cbd ? Number(cbd[1]) : null,
  };
}

/** CSV `rating` ≈ average, `rating2` ≈ count; `data2` can carry "from N reviews" as fallback. */
function parseReviewStats(row) {
  const avgRaw = col(row, 'rating').trim();
  const countRaw = col(row, 'rating2').trim();
  const data2 = col(row, 'data2');
  let avg_rating = null;
  if (avgRaw) {
    const n = Number(avgRaw.replace(/,/g, ''));
    if (Number.isFinite(n) && n >= 0 && n <= 5.01) avg_rating = Math.round(n * 100) / 100;
  }
  let review_count = 0;
  if (countRaw) {
    const n = Number.parseInt(String(countRaw).replace(/,/g, ''), 10);
    if (Number.isFinite(n) && n > 0) review_count = n;
  }
  if (review_count === 0 && data2) {
    const m = String(data2).match(/from\s+([\d,]+)\s+reviews?/i);
    if (m) {
      const n = Number.parseInt(m[1].replace(/,/g, ''), 10);
      if (Number.isFinite(n) && n > 0) review_count = n;
    }
  }
  if (avg_rating == null && data2) {
    const m = String(data2).match(/([\d.]+)\s*star/i);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n >= 0 && n <= 5.01) avg_rating = Math.round(n * 100) / 100;
    }
  }
  return { avg_rating, review_count };
}

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

function argvCsvPath() {
  const a = process.argv.slice(2).filter((x) => !x.startsWith('--'));
  return a[0] || '';
}

function normCatalogName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function catalogDupKey(brandId, productName) {
  return `${brandId}\0${normCatalogName(productName)}`;
}

/** Load existing (brand_id, name) keys for duplicate detection (paginated). */
async function loadExistingCatalogKeys(supabase) {
  const keys = new Set();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('catalog_products')
      .select('brand_id,name')
      .range(from, from + pageSize - 1);
    if (error) {
      if (String(error.message || '').includes('does not exist') || error.code === '42P01') {
        throw new Error(
          'Table catalog_products is missing. Apply supabase/migrations/0098_catalog_products_vendor_menu_pick.sql in the Supabase SQL Editor, then re-run.'
        );
      }
      throw error;
    }
    if (!data?.length) break;
    for (const r of data) {
      keys.add(catalogDupKey(r.brand_id, r.name));
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return keys;
}

async function ensureBrand(supabase, displayName, slugCache) {
  const name = displayName.trim();
  if (!name) throw new Error('Empty brand name');
  const key = name.toLowerCase();
  if (slugCache.ids.has(key)) return slugCache.ids.get(key);

  const slug = slugify(name);
  const { data: bySlug } = await supabase.from('brands').select('id,verified').eq('slug', slug).maybeSingle();
  if (bySlug?.id) {
    if (!bySlug.verified) {
      await supabase.from('brands').update({ verified: true }).eq('id', bySlug.id);
    }
    slugCache.ids.set(key, bySlug.id);
    return bySlug.id;
  }

  const { data: byName } = await supabase.from('brands').select('id,verified').ilike('name', name).maybeSingle();
  if (byName?.id) {
    if (!byName.verified) {
      await supabase.from('brands').update({ verified: true }).eq('id', byName.id);
    }
    slugCache.ids.set(key, byName.id);
    return byName.id;
  }

  let trySlug = slug;
  for (let i = 0; i < 30; i++) {
    const { data: clash } = await supabase.from('brands').select('id').eq('slug', trySlug).maybeSingle();
    if (!clash) break;
    trySlug = `${slug}-${i + 2}`;
  }

  const { data: ins, error } = await supabase
    .from('brands')
    .insert({ name, slug: trySlug, verified: true })
    .select('id')
    .single();
  if (error) throw error;
  slugCache.ids.set(key, ins.id);
  return ins.id;
}

async function main() {
  const csvPath = argvCsvPath();
  if (!csvPath) {
    console.error(
      'Usage: node scripts/import-catalog-csv.mjs <path-to.csv> [--dry-run] [--leafly] [--vendor-slug=slug] [--replace-vendor-menu] [--no-hq-image] [--allow-duplicates] [--no-mirror-images] [--strict-mirror]'
    );
    process.exit(1);
  }
  const resolved = path.resolve(csvPath);
  if (!fs.existsSync(resolved)) {
    console.error('File not found:', resolved);
    process.exit(1);
  }

  loadEnvFile(path.join(__dirname, '..', '.env.local'));
  loadEnvFile(path.join(__dirname, '..', '.env'));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!DRY && (!url || !key)) {
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or .env.local');
    process.exit(1);
  }

  const raw = fs.readFileSync(resolved, 'utf8');
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });

  const slugCache = { ids: new Map() };
  /** @type {{ brandName: string, row: Record<string, unknown>, vendorLink: { priceCents: number, saleDiscountPercent: number | null } | null }[]} */
  const payloads = [];
  let skipped = 0;

  if (LEAFLY) {
    for (const row of rows) {
      const title = col(row, 'data').trim();
      const brandName = leaflyBrandName(col(row, 'data8'));
      const catRaw = col(row, 'data7');
      const image = upgradeImageUrl(col(row, 'image').trim());
      const data2 = col(row, 'data2');
      const data9 = col(row, 'data9');
      const data11 = col(row, 'data11');
      const price = extractLeaflyPriceDollars(row);
      if (!title || !brandName || price == null) {
        skipped++;
        continue;
      }
      const category = mapLeaflyCategory(catRaw);
      const { potency_thc, potency_cbd } = parseLeaflyPotency(data2, data9);
      const saleDiscountPercent = parseLeaflySaleDiscountPercent(col(row, 'data4'));
      const descParts = [data2, data9, data11].filter(Boolean);
      const description = descParts.length ? descParts.join(' · ').slice(0, 4000) : null;
      const vendorLink =
        VENDOR_SLUG.trim().length > 0
          ? { priceCents: Math.round(price * 100), saleDiscountPercent }
          : null;
      payloads.push({
        brandName,
        row: {
          name: title.slice(0, 500),
          category,
          description,
          images: image ? [image] : [],
          potency_thc,
          potency_cbd,
          avg_rating: null,
          review_count: 0,
        },
        vendorLink,
      });
    }
  } else {
    for (const row of rows) {
      const title = col(row, 'product title').trim();
      const brandName = col(row, 'brand name').trim();
      const catRaw = col(row, 'category');
      const image = upgradeImageUrl(col(row, 'image').trim());
      const data3 = col(row, 'data3');
      const data5 = col(row, 'data5').trim();
      const { avg_rating, review_count } = parseReviewStats(row);

      if (!title || !brandName) {
        skipped++;
        continue;
      }

      const category = mapCategory(catRaw);
      const { potency_thc, potency_cbd } = parsePotency(data3);
      const descParts = [data5, data3].filter(Boolean);
      const description = descParts.length ? descParts.join(' · ').slice(0, 4000) : null;

      payloads.push({
        brandName,
        row: {
          name: title.slice(0, 500),
          category,
          description,
          images: image ? [image] : [],
          potency_thc,
          potency_cbd,
          avg_rating,
          review_count,
        },
        vendorLink: null,
      });
    }
  }

  if (VENDOR_SLUG && !LEAFLY) {
    console.error('--vendor-slug= only works with --leafly (Octoparse Leafly menu CSV).');
    process.exit(1);
  }

  console.log(
    `Parsed ${rows.length} CSV rows → ${payloads.length} catalog rows (${skipped} skipped missing title/brand${LEAFLY ? '/price' : ''}).`
  );

  const byCat = {};
  for (const p of payloads) {
    byCat[p.row.category] = (byCat[p.row.category] || 0) + 1;
  }
  console.log('By mapped category:', byCat);

  if (DRY) {
    const brands = new Set(payloads.map((p) => p.brandName));
    console.log(`Unique brands: ${brands.size}`);
    console.log([...brands].sort().join(', '));
    if (VENDOR_SLUG) {
      console.log(`Would link menu to vendor slug: ${VENDOR_SLUG}${REPLACE_VENDOR_MENU ? ' (replace existing products)' : ''}`);
    }
    console.log(
      ALLOW_DUPLICATES
        ? 'Dry run: --allow-duplicates would be used (insert duplicate names).'
        : 'Dry run: default mode skips rows that match existing brand + product name (and duplicates within the file).'
    );
    return;
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  if (!NO_MIRROR_IMAGES) {
    console.log('Mirroring CSV product images to bucket mirrored-images (PNG)…');
    const hashToPublicUrl = new Map();
    const sourceUrlCache = new Map();
    let mir = 0;
    for (const p of payloads) {
      const img = p.row.images?.[0];
      if (!img) continue;
      const next = await mirrorCatalogCsvImageUrl(supabase, url, img, hashToPublicUrl, sourceUrlCache, {
        strict: STRICT_MIRROR,
        force: FORCE_MIRROR,
      });
      p.row.images = next ? [next] : [];
      mir++;
      if (mir % 25 === 0) process.stdout.write(`\rMirrored ${mir} image URLs…`);
    }
    process.stdout.write(`\rMirrored ${mir} image URL(s); ${hashToPublicUrl.size} unique PNG object(s).\n`);
  }

  const skipDup = !ALLOW_DUPLICATES;
  let seenCatalog = new Set();
  if (skipDup) {
    console.log('Loading existing catalog_products for duplicate check…');
    seenCatalog = await loadExistingCatalogKeys(supabase);
    console.log(`Found ${seenCatalog.size} existing brand+name keys.`);
  }

  let insertedCatalog = 0;
  let insertedProducts = 0;
  let skippedDup = 0;
  const chunkSize = 250;
  let buffer = [];

  async function flushBuffer() {
    if (!buffer.length) return;
    const { error } = await supabase.from('catalog_products').insert(buffer);
    if (error) throw error;
    insertedCatalog += buffer.length;
    buffer = [];
  }

  let vendorId = null;
  if (VENDOR_SLUG) {
    const { data: vend, error: vErr } = await supabase.from('vendors').select('id').eq('slug', VENDOR_SLUG).maybeSingle();
    if (vErr) throw vErr;
    if (!vend?.id) {
      throw new Error(`Vendor not found for slug "${VENDOR_SLUG}". Create the shop or fix the slug, then re-run.`);
    }
    vendorId = vend.id;
    console.log(`Vendor menu target: ${VENDOR_SLUG} (${vendorId})`);
    if (REPLACE_VENDOR_MENU) {
      const { error: delErr } = await supabase.from('products').delete().eq('vendor_id', vendorId);
      if (delErr) throw delErr;
      console.log('Cleared existing public.products rows for this vendor (--replace-vendor-menu).');
    }
  }

  if (vendorId) {
    for (const p of payloads) {
      const { brandName, row, vendorLink } = p;
      if (!vendorLink) throw new Error('Internal error: vendor menu import requires vendorLink on each payload.');
      const brand_id = await ensureBrand(supabase, brandName, slugCache);
      const dk = catalogDupKey(brand_id, row.name);
      if (skipDup && seenCatalog.has(dk)) {
        skippedDup++;
        continue;
      }
      if (skipDup) seenCatalog.add(dk);

      const catalogInsert = {
        brand_id,
        name: row.name,
        category: row.category,
        description: row.description,
        images: row.images,
        potency_thc: row.potency_thc,
        potency_cbd: row.potency_cbd,
        avg_rating: row.avg_rating,
        review_count: row.review_count,
      };

      const { data: cp, error: cErr } = await supabase
        .from('catalog_products')
        .insert(catalogInsert)
        .select('id')
        .single();
      if (cErr) throw cErr;
      insertedCatalog++;

      const productRow = {
        vendor_id: vendorId,
        catalog_product_id: cp.id,
        brand_id,
        name: row.name,
        category: row.category,
        price_cents: vendorLink.priceCents,
        sale_discount_percent: vendorLink.saleDiscountPercent,
        images: row.images,
        potency_thc: row.potency_thc,
        potency_cbd: row.potency_cbd,
        description: row.description,
        brand_display_name: brandName,
        in_stock: true,
        inventory_count: 100,
        profit_cents: 0,
      };

      const { error: pErr } = await supabase.from('products').insert(productRow);
      if (pErr) throw pErr;
      insertedProducts++;
      if (insertedProducts % 25 === 0) process.stdout.write(`\rInserted ${insertedProducts} menu SKUs…`);
    }
    process.stdout.write('\n');
    console.log(
      `Done. catalog_products: ${insertedCatalog}, public.products: ${insertedProducts}, skipped duplicates: ${skippedDup}, brands touched: ${slugCache.ids.size}.`
    );
  } else {
    for (const { brandName, row } of payloads) {
      const brand_id = await ensureBrand(supabase, brandName, slugCache);
      const dk = catalogDupKey(brand_id, row.name);
      if (skipDup && seenCatalog.has(dk)) {
        skippedDup++;
        continue;
      }
      if (skipDup) seenCatalog.add(dk);
      buffer.push({ brand_id, ...row });
      if (buffer.length >= chunkSize) {
        await flushBuffer();
        process.stdout.write(`\rInserted ${insertedCatalog}…`);
      }
    }
    await flushBuffer();
    console.log(
      `\nDone. Inserted ${insertedCatalog} catalog_products. Skipped duplicates: ${skippedDup}. Brands touched/created: ${slugCache.ids.size}.`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
