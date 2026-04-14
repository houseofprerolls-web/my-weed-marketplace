/**
 * Delete all menu rows in public.products for Smokers Club vendors, then seed each shop with:
 * - catalog_products that already have photo URLs (brand catalog)
 * - synthetic flower SKUs from strains with encyclopedia photos (strain_id + images from strains.image_url)
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY
 * Loads greenzone-bolt/.env.local then .env
 *
 *   node scripts/refill-smokers-club-menus.mjs --dry-run
 *   node scripts/refill-smokers-club-menus.mjs --apply
 *   node scripts/refill-smokers-club-menus.mjs --apply --catalog=5 --strain=4
 */

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

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

const DRY = process.argv.includes('--dry-run') || !process.argv.includes('--apply');

function argInt(name, def) {
  const a = process.argv.find((x) => x.startsWith(`${name}=`));
  if (!a) return def;
  const n = Number.parseInt(a.split('=')[1], 10);
  return Number.isFinite(n) && n >= 0 ? n : def;
}

const CATALOG_EACH = argInt('--catalog', 5);
const STRAIN_EACH = argInt('--strain', 4);

const PRICE_BY_CATEGORY = {
  flower: 3500,
  preroll: 1600,
  vape: 4200,
  edible: 1800,
  concentrate: 5500,
  topical: 2400,
  other: 2000,
};

function hash32(s) {
  let h = 2166136261;
  const str = String(s);
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

function plausibleUrl(u) {
  const t = String(u || '').trim();
  return /^https?:\/\//i.test(t);
}

function firstImage(images) {
  if (!Array.isArray(images)) return '';
  for (const x of images) {
    if (plausibleUrl(x)) return String(x).trim();
  }
  return '';
}

/** Stable varied picks per vendor without colliding on catalog_product_id (unique per vendor). */
function pickCatalogForVendor(rows, vendorId, k) {
  const scored = rows.map((r) => ({ r, s: hash32(`${vendorId}:${r.id}`) }));
  scored.sort((a, b) => a.s - b.s);
  const out = [];
  const seen = new Set();
  for (const { r } of scored) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
    if (out.length >= k) break;
  }
  return out;
}

function pickStrainsForVendor(strains, vendorId, k, excludeStrainIds) {
  const pool = strains.filter((s) => plausibleUrl(s.image_url) && !excludeStrainIds.has(s.id));
  const scored = pool.map((s) => ({ s, sc: hash32(`${vendorId}:strain:${s.id}`) }));
  scored.sort((a, b) => a.sc - b.sc);
  return scored.slice(0, k).map((x) => x.s);
}

async function fetchAllClubVendorIds(supabase) {
  const out = [];
  let from = 0;
  const page = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from('vendors')
      .select('id,slug')
      .eq('smokers_club_eligible', true)
      .range(from, from + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const r of data) out.push({ id: r.id, slug: r.slug });
    if (data.length < page) break;
    from += page;
  }
  return out;
}

async function fetchCatalogWithPhotos(supabase) {
  const rows = [];
  let from = 0;
  const page = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from('catalog_products')
      .select('id,brand_id,name,category,description,images,strain_id,potency_thc,potency_cbd,brands(name)')
      .range(from, from + page - 1);
    if (error) {
      if (String(error.message || '').includes('does not exist')) return [];
      throw error;
    }
    if (!data?.length) break;
    for (const r of data) {
      if (firstImage(r.images)) rows.push(r);
    }
    if (data.length < page) break;
    from += page;
  }
  return rows;
}

async function fetchStrainsWithPhotos(supabase) {
  const rows = [];
  let from = 0;
  const page = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from('strains')
      .select('id,name,slug,description,image_url,thc_min,thc_max,cbd_min,cbd_max,type')
      .not('image_url', 'is', null)
      .range(from, from + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const r of data) {
      if (plausibleUrl(r.image_url)) rows.push(r);
    }
    if (data.length < page) break;
    from += page;
  }
  return rows;
}

function priceCentsForCategory(cat) {
  const c = String(cat || 'other').toLowerCase();
  return PRICE_BY_CATEGORY[c] ?? PRICE_BY_CATEGORY.other;
}

function rowToProductPayload(vendorId, row) {
  const brandName =
    row.brands && typeof row.brands === 'object' && row.brands.name != null
      ? String(row.brands.name)
      : null;
  return {
    vendor_id: vendorId,
    catalog_product_id: row.id,
    brand_id: row.brand_id,
    brand_display_name: brandName,
    strain_id: row.strain_id ?? null,
    name: row.name,
    category: row.category,
    description: row.description ?? null,
    images: Array.isArray(row.images) ? row.images.filter((u) => plausibleUrl(u)) : [],
    potency_thc: row.potency_thc ?? null,
    potency_cbd: row.potency_cbd ?? null,
    price_cents: priceCentsForCategory(row.category),
    inventory_count: 48,
    in_stock: true,
  };
}

function strainToProductPayload(vendorId, s) {
  const thc = s.thc_min != null ? Number(s.thc_min) : s.thc_max != null ? Number(s.thc_max) : null;
  const cbd = s.cbd_min != null ? Number(s.cbd_min) : s.cbd_max != null ? Number(s.cbd_max) : null;
  const blurb =
    typeof s.description === 'string' && s.description.trim()
      ? s.description.trim().slice(0, 500)
      : `${s.name} — encyclopedia flower pick.`;
  return {
    vendor_id: vendorId,
    catalog_product_id: null,
    brand_id: null,
    brand_display_name: null,
    strain_id: s.id,
    name: `${s.name} — Flower 3.5g`,
    category: 'flower',
    description: blurb,
    images: [String(s.image_url).trim()],
    potency_thc: thc,
    potency_cbd: cbd,
    price_cents: PRICE_BY_CATEGORY.flower,
    inventory_count: 48,
    in_stock: true,
  };
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

  const vendors = await fetchAllClubVendorIds(supabase);
  const catalogPool = await fetchCatalogWithPhotos(supabase);
  const strainPool = await fetchStrainsWithPhotos(supabase);

  console.log(
    JSON.stringify(
      {
        mode: DRY ? 'dry-run' : 'apply',
        smokersClubVendors: vendors.length,
        catalogWithPhotos: catalogPool.length,
        strainsWithPhotos: strainPool.length,
        perVendor: { catalog: CATALOG_EACH, strain: STRAIN_EACH },
      },
      null,
      2
    )
  );

  if (vendors.length === 0) {
    console.log('No smokers_club_eligible vendors; nothing to do.');
    return;
  }

  if (catalogPool.length === 0 && strainPool.length === 0) {
    console.error('No catalog or strain photo pools — aborting.');
    process.exit(1);
  }

  if (DRY) {
    const sample = vendors.slice(0, 3);
    for (const v of sample) {
      const cat = pickCatalogForVendor(catalogPool, v.id, CATALOG_EACH);
      const usedStrains = new Set(cat.map((r) => r.strain_id).filter(Boolean));
      const st = pickStrainsForVendor(strainPool, v.id, STRAIN_EACH, usedStrains);
      console.log(
        `sample vendor ${v.slug || v.id}: catalog=${cat.length} strain=${st.length} total=${cat.length + st.length}`
      );
    }
    console.log('Dry run only — pass --apply to delete + insert.');
    return;
  }

  const vendorIds = vendors.map((v) => v.id);
  const delChunk = 80;
  let deleted = 0;
  for (let i = 0; i < vendorIds.length; i += delChunk) {
    const chunk = vendorIds.slice(i, i + delChunk);
    const { error, count } = await supabase.from('products').delete({ count: 'exact' }).in('vendor_id', chunk);
    if (error) {
      console.error('Delete products failed:', error.message);
      process.exit(1);
    }
    deleted += count ?? 0;
  }
  console.log(`Deleted products rows (reported count sum)=${deleted}`);

  let inserted = 0;
  let vendorsTouched = 0;

  for (const v of vendors) {
    const cat = pickCatalogForVendor(catalogPool, v.id, CATALOG_EACH);
    const usedStrains = new Set(cat.map((r) => r.strain_id).filter(Boolean));
    let st = pickStrainsForVendor(strainPool, v.id, STRAIN_EACH, usedStrains);

    if (cat.length + st.length === 0) continue;

    /** If catalog pool empty, fill with more strains */
    if (cat.length === 0 && st.length < STRAIN_EACH + CATALOG_EACH) {
      st = pickStrainsForVendor(strainPool, v.id, STRAIN_EACH + CATALOG_EACH, new Set());
    }

    const payloads = [...cat.map((r) => rowToProductPayload(v.id, r)), ...st.map((s) => strainToProductPayload(v.id, s))];

    const { error: insErr } = await supabase.from('products').insert(payloads);
    if (insErr) {
      console.error(`Insert failed vendor ${v.slug || v.id}:`, insErr.message);
      continue;
    }
    inserted += payloads.length;
    vendorsTouched++;
  }

  console.log(JSON.stringify({ vendorsTouched, productsInserted: inserted }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
