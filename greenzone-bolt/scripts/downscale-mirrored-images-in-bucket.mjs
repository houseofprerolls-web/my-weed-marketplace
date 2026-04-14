/**
 * Downscale + recompress existing objects in Supabase Storage bucket `mirrored-images`.
 *
 * Why: re-fetching thousands of remote catalog URLs can be slow/blocked; this reads the
 * already-mirrored PNG/JPEG bytes from Storage, runs the same resize policy as
 * `scripts/lib/mirrorImageToStorage.mjs`, then uploads with upsert=true (same public URL).
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY
 * (loaded from greenzone-bolt/.env.local then .env)
 *
 *   node scripts/downscale-mirrored-images-in-bucket.mjs --dry-run
 *   node scripts/downscale-mirrored-images-in-bucket.mjs --apply
 *   node scripts/downscale-mirrored-images-in-bucket.mjs --apply --prefix=strains
 *   node scripts/downscale-mirrored-images-in-bucket.mjs --apply --min-bytes=750000
 */

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
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
const LIMIT = Math.max(0, Number.parseInt(argValue('--limit') || '0', 10) || 0);

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
      if (size != null) {
        out.push({ path: objectPath, size });
      } else {
        // Nested folder (prefix) — recurse one level (bucket layout is shallow).
        const nested = await listFolderFiles(supabase, objectPath);
        out.push(...nested);
      }
    }
    if (data.length < page) break;
    offset += page;
  }
  return out;
}

async function downloadObjectBytes(supabase, objectPath) {
  const { data, error } = await supabase.storage.from(MIRRORED_IMAGES_BUCKET).download(objectPath);
  if (error) throw error;
  const ab = await data.arrayBuffer();
  return Buffer.from(ab);
}

async function downscaleBuffer(buf) {
  return await sharp(buf)
    .rotate()
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, effort: 7 })
    .toBuffer();
}

async function uploadPng(supabase, objectPath, png) {
  const { error } = await supabase.storage.from(MIRRORED_IMAGES_BUCKET).upload(objectPath, png, {
    contentType: 'image/png',
    upsert: true,
    cacheControl: 'public, max-age=31536000, immutable',
  });
  if (error) throw error;
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

  /** @type {{path:string,size:number}[]} */
  let files = [];
  if (PREFIX) {
    const pref = PREFIX.replace(/^\/+|\/+$/g, '');
    files = await listFolderFiles(supabase, pref);
  } else {
    const { data: top, error: topErr } = await supabase.storage.from(MIRRORED_IMAGES_BUCKET).list('', {
      limit: 1000,
      offset: 0,
    });
    if (topErr) throw topErr;
    for (const entry of top || []) {
      const name = String(entry.name || '').replace(/\/+$/, '');
      if (!name) continue;
      if (entry.metadata?.size != null) {
        files.push({ path: name, size: Number(entry.metadata.size) });
        continue;
      }
      files.push(...(await listFolderFiles(supabase, name)));
    }
  }

  files.sort((a, b) => b.size - a.size);
  if (MIN_BYTES > 0) files = files.filter((f) => f.size >= MIN_BYTES);
  if (LIMIT > 0) files = files.slice(0, LIMIT);

  console.log(
    `Bucket=${MIRRORED_IMAGES_BUCKET} mode=${DRY ? 'DRY-RUN' : 'APPLY'} files=${files.length}` +
      (PREFIX ? ` prefix=${PREFIX}` : '') +
      (MIN_BYTES ? ` minBytes=${MIN_BYTES}` : '')
  );

  let ok = 0;
  let skipped = 0;
  let failed = 0;
  let saved = 0;

  for (const f of files) {
    try {
      const before = f.size;
      const raw = await downloadObjectBytes(supabase, f.path);
      const next = await downscaleBuffer(raw);
      const after = next.length;
      const delta = before - after;
      if (after >= before) {
        skipped++;
        console.log(`SKIP ${f.path} (${before}B -> ${after}B, not smaller)`);
        continue;
      }
      if (DRY) {
        ok++;
        saved += delta;
        console.log(`WOULD ${f.path} (${before}B -> ${after}B, -${delta}B)`);
        continue;
      }
      await uploadPng(supabase, f.path, next);
      ok++;
      saved += delta;
      console.log(`OK   ${f.path} (${before}B -> ${after}B, -${delta}B)`);
    } catch (e) {
      failed++;
      console.warn(`FAIL ${f.path}: ${e?.message || e}`);
    }
  }

  console.log(`Done. processed=${ok} skipped=${skipped} failed=${failed} savedBytes≈${saved}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
