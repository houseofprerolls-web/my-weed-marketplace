import { supabasePublicUrl } from '@/lib/supabasePublicEnv';

/**
 * Older seeds stored `/banners/homepage/*.svg` while `public/` ships `.png`.
 */
const HOMEPAGE_BUNDLED_SVG_TO_PNG: Record<string, string> = {
  '/banners/homepage/uncle-green-grand-opening.svg': '/banners/homepage/uncle-green-grand-opening.png',
  '/banners/homepage/uncle-green-free-gift.svg': '/banners/homepage/uncle-green-free-gift.png',
  '/banners/homepage/super-fresh-farms-split-ounce.svg': '/banners/homepage/super-fresh-farms-split-ounce.png',
  '/banners/homepage/green-haven-banner.svg': '/banners/homepage/green-haven-banner.png',
  '/banners/homepage/stiiizy-homepage.svg': '/banners/homepage/stiiizy-homepage.png',
  '/banners/homepage/stiiizy-banner.svg': '/banners/homepage/stiiizy-banner.png',
};

function mapBundledHomepageSvgToPng(path: string): string {
  const hit =
    HOMEPAGE_BUNDLED_SVG_TO_PNG[path] ??
    HOMEPAGE_BUNDLED_SVG_TO_PNG[path.toLowerCase()] ??
    Object.entries(HOMEPAGE_BUNDLED_SVG_TO_PNG).find(([k]) => k.toLowerCase() === path.toLowerCase())?.[1];
  return hit ?? path;
}

function supabaseStoragePublicBase(): string {
  return supabasePublicUrl.replace(/\/$/, '');
}

/** Repair Next-origin paths that should load Supabase Storage public objects. */
function absolutizeSupabaseVendorMediaForImg(t: string): string | null {
  const base = supabaseStoragePublicBase();
  if (!base) return null;

  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      const path = u.pathname || '';
      const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
      if (!local) return null;
      if (path.startsWith('/storage/v1/object/public/')) {
        return `${base}${path}${u.search}`;
      }
      if (path.startsWith('/vendor-media/')) {
        return `${base}/storage/v1/object/public${path}${u.search}`;
      }
    } catch {
      return null;
    }
    return null;
  }

  const pathOnly = t.startsWith('/') ? t : `/${t}`;
  if (pathOnly.startsWith('/storage/v1/object/public/')) {
    return `${base}${pathOnly}`;
  }
  if (pathOnly.startsWith('/vendor-media/')) {
    return `${base}/storage/v1/object/public${pathOnly}`;
  }
  return null;
}

/** Normalize DB `image_url` for `<img src>` (read path). */
export function normalizeMarketingBannerImageUrl(raw: string | null | undefined): string {
  const t = typeof raw === 'string' ? raw.trim() : '';
  if (!t) return '';
  if (t.startsWith('//')) return t;
  if (/^(data|blob):/i.test(t)) return t;

  const storageFixed = absolutizeSupabaseVendorMediaForImg(t);
  if (storageFixed) return storageFixed;

  if (/^https?:\/\//i.test(t)) return t;

  const withSlash = t.startsWith('/') ? t : `/${t}`;
  if (withSlash.toLowerCase().endsWith('.svg') && withSlash.includes('/banners/homepage/')) {
    const mapped = mapBundledHomepageSvgToPng(withSlash);
    if (mapped !== withSlash) return mapped;
    if (/stiiizy|stiizy/i.test(withSlash)) {
      return withSlash.replace(/\.svg$/i, '.png');
    }
    return mapped;
  }
  return withSlash;
}

/** Canonical URL for carousel slides after normalization. */
export function resolveMarketingBannerImageUrl(raw: string | null | undefined): string {
  const n = normalizeMarketingBannerImageUrl(raw);
  if (n.length > 0) return n;
  return typeof raw === 'string' ? raw.trim() : '';
}
