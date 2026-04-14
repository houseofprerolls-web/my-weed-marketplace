/**
 * Fetch remote raster image → PNG → Supabase Storage `mirrored-images` bucket.
 * Used by catalog CSV import and mirror backfill scripts.
 */
import crypto from 'node:crypto';
import sharp from 'sharp';

const BUCKET = 'mirrored-images';
/** Browser-like UA — some CDNs (e.g. Weedmaps) block non-browser clients. */
const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

export function normalizeRemoteImageUrl(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  if (s.startsWith('//')) return `https:${s}`;
  return s;
}

export function isAlreadyMirrored(assetUrl, supabaseProjectUrl) {
  if (!assetUrl || typeof assetUrl !== 'string') return false;
  const t = assetUrl.trim();
  if (!/^https?:\/\//i.test(t)) return false;
  try {
    const host = new URL(supabaseProjectUrl).hostname;
    if (!t.includes(host)) return false;
    return t.includes(`/storage/v1/object/public/${BUCKET}/`);
  } catch {
    return false;
  }
}

function fetchHeadersForUrl(sourceUrl) {
  const h = { ...FETCH_HEADERS };
  try {
    const u = new URL(sourceUrl);
    h.Referer = `${u.origin}/`;
  } catch {
    /* ignore */
  }
  return h;
}

export async function fetchUrlToPngBuffer(sourceUrl, timeoutMs = 45000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const raw = normalizeRemoteImageUrl(sourceUrl);
    if (!raw) throw new Error('empty URL');
    const res = await fetch(raw, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: fetchHeadersForUrl(raw),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) throw new Error('empty body');
    // Downscale menu/hero assets — full-res PNGs (multi‑MB) tank LCP and scroll perf.
    return await sharp(buf)
      .rotate()
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9, effort: 7 })
      .toBuffer();
  } finally {
    clearTimeout(to);
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} sourceUrl
 * @param {string} objectPath - path inside bucket, e.g. strains/{uuid}.png
 * @param {Map<string,string>} [urlCache] - maps source → public URL
 * @returns {Promise<string>} public URL (or original on failure if not strict)
 */
export async function mirrorRemoteToStorage(supabase, supabaseUrl, sourceUrl, objectPath, opts = {}) {
  const { urlCache = null, strict = false, force = false } = opts;
  const raw = normalizeRemoteImageUrl(sourceUrl);
  if (!raw || !/^https?:\/\//i.test(raw)) return String(sourceUrl || '').trim();
  if (!force && isAlreadyMirrored(raw, supabaseUrl)) return raw;
  const cacheKey = String(sourceUrl || '').trim();
  if (!force) {
    if (urlCache?.has(cacheKey)) return urlCache.get(cacheKey);
    if (urlCache?.has(raw)) return urlCache.get(raw);
  }

  let png;
  try {
    png = await fetchUrlToPngBuffer(raw);
  } catch (e) {
    const cause = e?.cause ? ` (${String(e.cause.message || e.cause)})` : '';
    const msg = `mirror fetch failed (${raw.slice(0, 80)}…): ${e?.message || e}${cause}`;
    if (strict) throw new Error(msg);
    console.warn(msg);
    return raw;
  }

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(objectPath, png, {
    contentType: 'image/png',
    upsert: true,
    cacheControl: 'public, max-age=31536000, immutable',
  });
  if (upErr) {
    const msg = `mirror upload failed ${objectPath}: ${upErr.message}`;
    if (strict) throw new Error(msg);
    console.warn(msg);
    return raw;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  const pub = data?.publicUrl || raw;
  urlCache?.set(cacheKey, pub);
  urlCache?.set(raw, pub);
  return pub;
}

/** Dedupe identical sources within a batch (same PNG bytes → same path). */
export function hashKeyForMirror(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 40);
}

/**
 * CSV catalog import: stable path by content hash so duplicate photos share one object.
 */
export async function mirrorCatalogCsvImageUrl(
  supabase,
  supabaseUrl,
  sourceUrl,
  hashToPublicUrl,
  sourceUrlCache,
  { strict = false, force = false } = {}
) {
  const origKey = String(sourceUrl || '').trim();
  const raw = normalizeRemoteImageUrl(sourceUrl);
  if (!raw || !/^https?:\/\//i.test(raw)) return origKey;
  if (!force && isAlreadyMirrored(raw, supabaseUrl)) return raw;
  if (!force) {
    if (sourceUrlCache?.has(origKey)) return sourceUrlCache.get(origKey);
    if (sourceUrlCache?.has(raw)) return sourceUrlCache.get(raw);
  }

  let png;
  try {
    png = await fetchUrlToPngBuffer(raw);
  } catch (e) {
    const msg = `catalog CSV image fetch failed: ${e?.message || e}`;
    if (strict) throw new Error(msg);
    console.warn(msg);
    return raw;
  }

  const h = hashKeyForMirror(png);
  if (!force && hashToPublicUrl?.has(h)) {
    const pub = hashToPublicUrl.get(h);
    sourceUrlCache?.set(origKey, pub);
    sourceUrlCache?.set(raw, pub);
    return pub;
  }

  const objectPath = `catalog-import/${h}.png`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(objectPath, png, {
    contentType: 'image/png',
    upsert: true,
    cacheControl: 'public, max-age=31536000, immutable',
  });
  if (upErr) {
    const msg = `catalog CSV upload failed: ${upErr.message}`;
    if (strict) throw new Error(msg);
    console.warn(msg);
    return raw;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  const pub = data?.publicUrl || raw;
  hashToPublicUrl?.set(h, pub);
  sourceUrlCache?.set(origKey, pub);
  sourceUrlCache?.set(raw, pub);
  return pub;
}

export { BUCKET as MIRRORED_IMAGES_BUCKET };
