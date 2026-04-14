/**
 * Delete Storage objects in `mirrored-images` that are not referenced by the database.
 *
 * This is most useful for content-addressed paths like `catalog-import/{sha}.png` where
 * re-hashing after downscaling can orphan older objects.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY
 * (loaded from greenzone-bolt/.env.local then .env)
 *
 *   node scripts/cleanup-unreferenced-mirrored-images.mjs --dry-run --prefix=catalog-import
 *   node scripts/cleanup-unreferenced-mirrored-images.mjs --apply --prefix=catalog-import --min-bytes=750000
 */

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { MIRRORED_IMAGES_BUCKET } from './lib/mirrorImageToStorage.mjs';

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

function argValue(name) {
  const a = process.argv.find((x) => x === name || x.startsWith(`${name}=`));
  if (!a) return null;
  if (a.includes('=')) return a.split('=').slice(1).join('=');
  const i = process.argv.indexOf(a);
  const next = process.argv[i + 1];
  if (next && !next.startsWith('-')) return next;
  return null;
}

const DRY = process.argv.includes('--dry-run') || !process.argv.includes('--apply');
const PREFIX = (argValue('--prefix') || '').replace(/^\/+|\/+$/g, '');
const MIN_BYTES = Math.max(0, Number.parseInt(argValue('--min-bytes') || '0', 10) || 0);

const MARKER = `/storage/v1/object/public/${MIRRORED_IMAGES_BUCKET}/`;

function objectPathFromPublicUrl(u) {
  const s = String(u || '').trim();
  if (!s) return null;
  const idx = s.indexOf(MARKER);
  if (idx < 0) return null;
  return s.slice(idx + MARKER.length).split('?')[0].split('#')[0];
}

async function listFolderFiles(supabase, folderPrefix) {
  /** @type {{path:string,size:number}[]} */
  const out = [];
  let offset = 0;
  const page = 1000;
  for (;;) {
    const { data, error } = await supabase.storage.from(MIRRORED_IMAGES_BUCKET).list(folderPrefix, {
      limit: page,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    if (!data?.length) break;
    for (const entry of data) {
      const objectPath = folderPrefix ? `${folderPrefix}/${entry.name}` : entry.name;
      const size = entry.metadata?.size != null ? Number(entry.metadata.size) : null;
      if (size != null) out.push({ path: objectPath, size });
      else out.push(...(await listFolderFiles(supabase, objectPath)));
    }
    if (data.length < page) break;
    offset += page;
  }
  return out;
}

async function collectReferencedObjectPaths(supabase) {
  const referenced = new Set();

  const addUrl = (u) => {
    const p = objectPathFromPublicUrl(u);
    if (p) referenced.add(p);
  };

  async function forEachRow(table, select, onRow, pageSize = 1000) {
    let from = 0;
    for (;;) {
      const { data, error } = await supabase.from(table).select(select).range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data?.length) break;
      for (const row of data) onRow(row);
      if (data.length < pageSize) break;
      from += pageSize;
    }
  }

  await forEachRow('strains', 'image_url', (row) => addUrl(row.image_url));

  // brands.logo_url (table may be empty in some environments)
  try {
    await forEachRow('brands', 'logo_url', (row) => addUrl(row.logo_url));
  } catch (e) {
    console.warn('brands scan skipped:', e?.message || e);
  }

  await forEachRow('catalog_products', 'images', (row) => {
    const imgs = row.images;
    if (!imgs) return;
    if (Array.isArray(imgs)) {
      for (const x of imgs) addUrl(x);
    } else if (typeof imgs === 'string') {
      addUrl(imgs);
    }
  });

  return referenced;
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
  if (!PREFIX) {
    console.error('Pass --prefix=... (recommended: catalog-import)');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  console.log(`Loading referenced object paths from DB…`);
  const referenced = await collectReferencedObjectPaths(supabase);
  console.log(`Referenced paths≈${referenced.size}`);

  let files = await listFolderFiles(supabase, PREFIX.replace(/\/+$/, ''));
  if (MIN_BYTES > 0) files = files.filter((f) => f.size >= MIN_BYTES);

  const toDelete = files.filter((f) => !referenced.has(f.path)).map((f) => f.path);
  toDelete.sort();

  console.log(
    `Bucket=${MIRRORED_IMAGES_BUCKET} prefix=${PREFIX} mode=${DRY ? 'DRY-RUN' : 'APPLY'} candidates=${toDelete.length}` +
      (MIN_BYTES ? ` minBytes=${MIN_BYTES}` : '')
  );

  const chunk = 100;
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += chunk) {
    const batch = toDelete.slice(i, i + chunk);
    if (DRY) {
      for (const p of batch) console.log(`WOULD DELETE ${p}`);
      deleted += batch.length;
      continue;
    }
    const { error } = await supabase.storage.from(MIRRORED_IMAGES_BUCKET).remove(batch);
    if (error) throw error;
    deleted += batch.length;
    console.log(`Deleted ${deleted}/${toDelete.length}…`);
  }

  console.log(`Done. ${DRY ? 'would delete' : 'deleted'}=${deleted}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
