import { strainImageCandidates } from '@/lib/leaflyStrainImage';

export type StrainEmbedRow = { slug: string; image_url: string | null };

/**
 * Make stored URLs loadable in `<img src>` (protocol-relative CDNs often fail `new URL()` without this).
 */
export function normalizeMenuImageUrl(u: string): string {
  let s = String(u || '').trim();
  if (!s) return '';
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  if (!s) return '';
  const low = s.toLowerCase();
  if (low === 'undefined' || low === 'null') return '';
  if (s.startsWith('//')) return `https:${s}`;
  return s;
}

/** Skip obvious junk so we can fall through to the next candidate (strain / Leafly / placeholder). */
export function plausibleImageUrl(u: string): boolean {
  const s = normalizeMenuImageUrl(u);
  if (!s) return false;
  if (s.startsWith('data:image/')) return true;
  if (s.startsWith('blob:')) return true;
  if (s.startsWith('/')) return s.length > 1;
  try {
    const parsed = new URL(s);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Menu / cart hero URLs: product image first (when usable), then strain DB + Leafly guesses.
 * Deduped; drops non-plausible strings. URLs are normalized for the browser (e.g. //host → https://host).
 * Use `strainDetailPage` on /strains/[slug] only — full Leafly matrix; menus use a short list.
 */
export function mergeMenuImageCandidates(
  preferredUrl: string | null | undefined,
  strainImageUrl: string | null | undefined,
  strainSlug: string | null | undefined,
  opts?: { strainDetailPage?: boolean }
): string[] {
  const slug = String(strainSlug || '').trim();
  const compactLeafly = !opts?.strainDetailPage;
  const tail = slug ? strainImageCandidates(strainImageUrl, slug, { compactLeafly }) : [];
  const pref = typeof preferredUrl === 'string' ? preferredUrl.trim() : '';
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (raw: string) => {
    const n = normalizeMenuImageUrl(raw);
    if (!plausibleImageUrl(raw)) return;
    if (seen.has(n)) return;
    seen.add(n);
    out.push(n);
  };
  if (pref) push(pref);
  for (const u of tail) push(u);
  return out;
}

/** Normalize PostgREST `strains` embed (object or single-element array). */
export function parseStrainsEmbed(row: {
  strains?: StrainEmbedRow | StrainEmbedRow[] | null;
}): StrainEmbedRow | null {
  const s = row.strains;
  if (!s) return null;
  if (Array.isArray(s)) return s[0] ?? null;
  return s;
}

/**
 * First image URL for menus/cart — same precedence as menu tiles: explicit product photos first
 * (encyclopedia pick, uploads, catalog SKU), then strain encyclopedia / Leafly candidates.
 */
export function menuProductHeroImageUrl(row: {
  images: string[];
  strains?: StrainEmbedRow | StrainEmbedRow[] | null;
}): string | null {
  const im = row.images;
  const pref =
    Array.isArray(im) && im.length > 0 ? String(im[0] ?? '').trim() || null : null;
  const se = parseStrainsEmbed(row);
  const merged = mergeMenuImageCandidates(pref, se?.image_url ?? null, se?.slug ?? null);
  return merged[0] ?? null;
}

/** Promo art for a deal row (`image_url` column wins over JSON `hero_image_url`). */
export function dealPromoImageUrl(row: {
  image_url?: string | null;
  deal_options?: { hero_image_url?: string } | null;
} | null | undefined): string | null {
  if (!row) return null;
  const col = typeof row.image_url === 'string' ? row.image_url.trim() : '';
  if (col && plausibleImageUrl(col)) return normalizeMenuImageUrl(col);
  const h = row.deal_options?.hero_image_url;
  const hs = typeof h === 'string' ? h.trim() : '';
  if (hs && plausibleImageUrl(hs)) return normalizeMenuImageUrl(hs);
  return null;
}

/**
 * When an active deal applies to this SKU, its promo image is preferred over the product photo
 * (deal tiles + menu cards stay visually aligned).
 */
export function menuProductHeroImageUrlWithDeal(
  row: {
    images: string[];
    strains?: StrainEmbedRow | StrainEmbedRow[] | null;
  },
  deal: {
    image_url?: string | null;
    deal_options?: { hero_image_url?: string } | null;
  } | null
): string | null {
  const dealArt = dealPromoImageUrl(deal);
  const im = row.images;
  const productFirst =
    Array.isArray(im) && im.length > 0 ? String(im[0] ?? '').trim() || null : null;
  const preferred = dealArt || productFirst;
  const se = parseStrainsEmbed(row);
  const merged = mergeMenuImageCandidates(preferred, se?.image_url ?? null, se?.slug ?? null);
  return merged[0] ?? null;
}

const SFF_MENU_PLACEHOLDER_MARK = 'sff-menu-placeholder';

/**
 * Menu tiles default to `object-cover`, which crops tall/wide art to fill the thumb.
 * The Super Fresh Farms seed placeholder is a circular logo — cover crops it to an empty-looking box.
 */
export function menuThumbUsesPlaceholderFit(heroUrl: string | null | undefined): boolean {
  return String(heroUrl ?? '').includes(SFF_MENU_PLACEHOLDER_MARK);
}

/** `className` for StrainHeroImage `imgClassName` on square menu thumbs (grid / listing cards). */
export function menuThumbImgClassName(heroUrl: string | null | undefined): string {
  return menuThumbUsesPlaceholderFit(heroUrl)
    ? 'h-full w-full object-contain object-center bg-zinc-900 p-1.5'
    : 'h-full w-full object-cover';
}

/** Fixed 5rem list-row thumbs on vendor menu. */
export function menuThumbImgClassNameFixed(heroUrl: string | null | undefined): string {
  return menuThumbUsesPlaceholderFit(heroUrl)
    ? 'h-20 w-20 object-contain object-center bg-zinc-900 p-2'
    : 'h-20 w-20 object-cover';
}
