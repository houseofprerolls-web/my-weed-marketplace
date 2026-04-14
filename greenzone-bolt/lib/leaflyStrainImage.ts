/**
 * Best-effort Leafly flower image URLs from our strain slug.
 * Filenames on the CDN do not always equal the slug (e.g. sunset-sherbert vs sherbert);
 * callers should try candidates in order and fall back on error.
 */
const LEAFLY_FLOWER_BASE = 'https://images.leafly.com/flower-images';

/** Insert hyphens at letter↔digit boundaries so gg4 → gg-4 (matches many CSV paths). */
export function leaflySlugVariants(slug: string): string[] {
  const s = slug.trim().toLowerCase();
  if (!s) return [];
  const dashed = s
    .replace(/([a-z])(\d)/g, '$1-$2')
    .replace(/(\d)([a-z])/g, '$1-$2');
  return Array.from(new Set([s, dashed]));
}

export function leaflyFlowerImageCandidates(slug: string): string[] {
  const variants = leaflySlugVariants(slug);
  const suffixes = ['', '-fixed', '-nug-image'];
  const exts = ['jpg', 'jpeg', 'png', 'webp'];
  const urls: string[] = [];
  for (const v of variants) {
    for (const suf of suffixes) {
      for (const ext of exts) {
        urls.push(`${LEAFLY_FLOWER_BASE}/${v}${suf}.${ext}`);
      }
    }
  }
  return Array.from(new Set(urls));
}

/**
 * Short Leafly list for menus/grids — avoids dozens of sequential failed loads per tile.
 */
export function leaflyFlowerImageCandidatesMenu(slug: string): string[] {
  const variants = leaflySlugVariants(slug);
  const urls: string[] = [];
  for (const v of variants) {
    urls.push(`${LEAFLY_FLOWER_BASE}/${v}.jpg`);
    urls.push(`${LEAFLY_FLOWER_BASE}/${v}.webp`);
    urls.push(`${LEAFLY_FLOWER_BASE}/${v}-nug-image.jpg`);
    urls.push(`${LEAFLY_FLOWER_BASE}/${v}-nug-image.webp`);
  }
  return Array.from(new Set(urls));
}

/** Stored URL first (if any), then Leafly guesses. */
export function strainImageCandidates(
  storedUrl: string | null | undefined,
  slug: string,
  opts?: { compactLeafly?: boolean }
): string[] {
  const trimmed = typeof storedUrl === 'string' ? storedUrl.trim() : '';
  const primary = trimmed ? [trimmed] : [];
  const leafly =
    opts?.compactLeafly === false ? leaflyFlowerImageCandidates(slug) : leaflyFlowerImageCandidatesMenu(slug);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of [...primary, ...leafly]) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}
