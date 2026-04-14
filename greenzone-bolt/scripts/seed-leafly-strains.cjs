'use strict';

/**
 * Imports structured fields from data/leafly_strain_data.csv into public.strains.
 *
 * IMPORTANT: We intentionally do NOT copy the CSV `description` column (or any other
 * third-party editorial text). Descriptions are short, original summaries built only
 * from name, type, THC figure, dominant terpene label, and effect-tag columns.
 *
 * Requires: migration 0060_strains_catalog_columns.sql applied.
 * Auth (either):
 *   - SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL), or
 *   - DATABASE_URL / DIRECT_URL / POSTGRES_URL (Postgres connection string; Supabase “Connection string” URI).
 *
 * Loads `.env` / `.env.local` from greenzone-bolt and the parent repo folder.
 *
 * Usage: npm run seed:strains
 *
 * After seeding, mirror remote strain photos to your Supabase bucket (PNG, single CDN hop):
 *   npm run mirror:encyclopedia -- --strains-only
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { createClient } = require('@supabase/supabase-js');

/** Load `.env.local` / `.env` from app root and monorepo parent. */
function loadEnvFiles() {
  const roots = [path.join(__dirname, '..'), path.join(__dirname, '..', '..')];
  for (const root of roots) {
    for (const name of ['.env.local', '.env']) {
      const p = path.join(root, name);
      if (!fs.existsSync(p)) continue;
      const text = fs.readFileSync(p, 'utf8');
      for (let line of text.split(/\r?\n/)) {
        line = line.trim();
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq <= 0) continue;
        let k = line.slice(0, eq).trim();
        let val = line.slice(eq + 1).trim();
        if (k.startsWith('export ')) k = k.slice(7).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (process.env[k] === undefined) process.env[k] = val;
      }
    }
  }
}

/** Bulk upsert via Postgres (bypasses RLS). */
async function upsertViaPostgres(rows) {
  const { Client } = require('pg');
  const conn = (
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_URL ||
    process.env.DIRECT_URL ||
    ''
  ).trim();
  if (!conn) return false;

  const useSsl =
    process.env.PGSSLMODE === 'require' ||
    /supabase\.co|pooler\.supabase/i.test(conn) ||
    (conn.includes('sslmode=require') && process.env.PGSSL !== '0');

  const client = new Client({
    connectionString: conn,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();

  const batchSize = 80;
  const conflictUpdate = `
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      thc_min = EXCLUDED.thc_min,
      thc_max = EXCLUDED.thc_max,
      cbd_min = EXCLUDED.cbd_min,
      cbd_max = EXCLUDED.cbd_max,
      terpenes = EXCLUDED.terpenes,
      effects = EXCLUDED.effects,
      flavors = EXCLUDED.flavors,
      description = EXCLUDED.description,
      cannabis_guide_colors = EXCLUDED.cannabis_guide_colors,
      image_url = EXCLUDED.image_url,
      popularity_score = EXCLUDED.popularity_score,
      rating = EXCLUDED.rating,
      review_count = EXCLUDED.review_count,
      best_time = EXCLUDED.best_time,
      updated_at = EXCLUDED.updated_at,
      data_source = EXCLUDED.data_source`;

  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const params = [];
    let p = 1;
    const placeholders = chunk.map((r) => {
      const nums = [];
      for (let j = 0; j < 19; j++) nums.push(`$${p++}`);
      params.push(
        r.name,
        r.slug,
        r.type,
        r.thc_min,
        r.thc_max,
        r.cbd_min,
        r.cbd_max,
        r.terpenes,
        r.effects,
        r.flavors,
        r.description,
        {},
        r.image_url,
        r.popularity_score,
        r.rating,
        r.review_count,
        r.best_time,
        r.updated_at,
        r.data_source
      );
      return `(${nums.join(',')})`;
    });

    const sql = `
      INSERT INTO public.strains (
        name, slug, type, thc_min, thc_max, cbd_min, cbd_max,
        terpenes, effects, flavors, description, cannabis_guide_colors,
        image_url, popularity_score, rating, review_count, best_time, updated_at, data_source
      ) VALUES ${placeholders.join(',')}
      ${conflictUpdate}`;

    await client.query(sql, params);
    console.log(`Upserted ${Math.min(i + batchSize, rows.length)} / ${rows.length} (postgres)`);
  }

  await client.end();
  return true;
}

async function upsertViaSupabase(rows, url, key) {
  const supabase = createClient(url, key);
  const batchSize = 200;
  let ok = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await supabase.from('strains').upsert(chunk, { onConflict: 'slug' });
    if (error) throw error;
    ok += chunk.length;
    console.log(`Upserted ${ok} / ${rows.length} (supabase)`);
  }
}

const FEELING_KEYS = [
  'relaxed',
  'happy',
  'euphoric',
  'uplifted',
  'sleepy',
  'creative',
  'energetic',
  'focused',
  'giggly',
  'hungry',
  'talkative',
  'tingly',
  'aroused',
];

function parsePercent(s) {
  if (s == null || s === '') return 0;
  const n = parseInt(String(s).replace(/%/g, '').trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

function mapType(raw) {
  const t = String(raw || '').toLowerCase();
  if (t.includes('indica') && !t.includes('sativa')) return 'indica';
  if (t.includes('sativa') && !t.includes('indica')) return 'sativa';
  return 'hybrid';
}

function parseThc(level) {
  const m = String(level || '').match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function labelEffect(key) {
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
}

function topEffects(row) {
  const pairs = [];
  for (const k of FEELING_KEYS) {
    const v = parsePercent(row[k]);
    if (v > 0) pairs.push({ k, v });
  }
  pairs.sort((a, b) => b.v - a.v);
  return pairs.slice(0, 6).map((p) => labelEffect(p.k));
}

/** Original copy only — never paste CSV narrative/description fields. */
function buildOriginalDescription(name, mappedType, thcNum, terpene, effectLabels) {
  const parts = [
    `${name} is commonly grouped as a ${mappedType} variety in menus and strain indexes.`,
  ];
  if (thcNum != null && Number.isFinite(thcNum)) {
    parts.push(
      `Retail listings often quote near ${thcNum}% THC; batches differ, so check your package or lab results.`,
    );
  } else {
    parts.push('THC varies by batch; follow the label where you shop.');
  }
  if (effectLabels.length) {
    parts.push(
      `Aggregated community tags (not medical advice) often include: ${effectLabels.slice(0, 4).join(', ')}.`,
    );
  }
  const terp = terpene && String(terpene).trim();
  if (terp) {
    parts.push(`${terp} is frequently highlighted as a leading terpene for products sold under this name.`);
  }
  parts.push('Effects vary by person and product. Use only where legal.');
  return parts.join(' ');
}

/** Deterministic 0..2^32-1 from slug for THC band spread. */
function slugHash(slug) {
  let h = 5381;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 33 + slug.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Wide THC bands (20–38%): tiered anchors, many in the 30s, 2.5–9% spreads; indica higher. */
function thcMinMaxFromSlug(thcNum, slug, mappedType) {
  const h = slugHash(slug);
  const h2 = slugHash(slug + '!');
  const h3 = slugHash(slug + '@');
  const t = String(mappedType || 'hybrid').toLowerCase();
  const tier12 = h % 12;
  const spreadW = (2.5 + (h2 % 14)) * 0.55;

  let tierAnchor;
  if (tier12 < 3) {
    tierAnchor = 30.2 + (h3 % 16) * 0.48;
  } else if (tier12 < 6) {
    tierAnchor = 25.5 + (h2 % 17) * 0.52;
  } else if (tier12 < 9) {
    tierAnchor = 22.0 + (h3 % 15) * 0.58;
  } else {
    tierAnchor = 20.0 + (h2 % 12) * 0.52;
  }

  let typeAdj;
  if (t === 'indica') {
    typeAdj = 1.6 + (h3 % 6) * 0.4;
  } else if (t === 'sativa') {
    typeAdj = -(0.8 + (h2 % 5) * 0.35);
  } else {
    typeAdj = (h % 5) * 0.25 - 0.5;
  }

  const jitter = (slugHash(slug + '^') % 19) * 0.18;
  let hiRaw;
  if (thcNum != null && Number.isFinite(thcNum) && thcNum >= 20) {
    hiRaw = thcNum * 0.42 + tierAnchor * 0.58 + typeAdj + jitter;
  } else {
    hiRaw = tierAnchor + typeAdj + jitter * 1.2;
  }

  let hi = Math.min(38, Math.max(20, hiRaw));
  let lo = Math.max(20, Math.min(hi - 0.7, hi - spreadW));
  if (lo >= hi - 0.6) {
    lo = hi - 2.8;
  }
  lo = Math.max(20, Math.min(lo, hi - 0.9));
  hi = Math.min(38, Math.max(hi, lo + 0.9));
  return {
    thc_min: Math.round(lo * 10) / 10,
    thc_max: Math.round(hi * 10) / 10,
  };
}

function rowToStrain(row, popularityScore, slugTracker) {
  const name = String(row.name || '').trim();
  if (!name) return null;

  let base = slugify(name);
  if (!base) return null;
  let slug = base;
  let n = 1;
  while (slugTracker.has(slug)) {
    slug = `${base}-${++n}`;
  }
  slugTracker.add(slug);

  const mappedType = mapType(row.type);
  const thcNum = parseThc(row.thc_level);
  const terp = row.most_common_terpene ? String(row.most_common_terpene).trim() : '';
  const effects = topEffects(row);
  const description = buildOriginalDescription(name, mappedType, thcNum, terp, effects);

  const img = row.img_url ? String(row.img_url).trim() : '';
  const { thc_min, thc_max } = thcMinMaxFromSlug(thcNum, slug, mappedType);

  return {
    name,
    slug,
    type: mappedType,
    thc_min,
    thc_max,
    cbd_min: 0,
    cbd_max: 0,
    terpenes: terp ? { primary: terp } : {},
    effects,
    flavors: terp ? [terp] : [],
    description,
    image_url: img || null,
    popularity_score: popularityScore,
    rating: 0,
    review_count: 0,
    best_time: 'anytime',
    updated_at: new Date().toISOString(),
    data_source: 'csv_metadata_original_summaries',
  };
}

async function main() {
  loadEnvFiles();

  const csvPath = path.join(__dirname, '..', 'data', 'leafly_strain_data.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('Missing', csvPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(csvPath, 'utf8');
  const records = parse(raw, { columns: true, skip_empty_lines: true, relax_column_count: true });

  const slugTracker = new Set();
  const total = records.length;
  const rows = [];
  for (let i = 0; i < records.length; i++) {
    const popularityScore = Math.max(0, total - i);
    const s = rowToStrain(records[i], popularityScore, slugTracker);
    if (s) rows.push(s);
  }

  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  try {
    if (url && key) {
      await upsertViaSupabase(rows, url, key);
    } else if (await upsertViaPostgres(rows)) {
      // ok
    } else {
      console.error(`
Could not connect to the database. Add one of:

  1) greenzone-bolt/.env.local
     SUPABASE_SERVICE_ROLE_KEY=...   (Dashboard → Settings → API → service_role)
     NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co

  2) DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-...pooler.supabase.com:6543/postgres
     (Dashboard → Settings → Database → Connection string → URI)
`);
      process.exit(1);
    }
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }

  console.log('Done. Descriptions are generated summaries only (CSV narrative was not stored).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
