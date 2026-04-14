import { supabasePublicUrl } from '@/lib/supabasePublicEnv';

const SUPABASE_HOST = (() => {
  try {
    const u = supabasePublicUrl.trim();
    if (!u) return null;
    return new URL(u).hostname.toLowerCase();
  } catch {
    return null;
  }
})();

/**
 * Allowed when saving a banner creative from admin/vendor UI.
 * Rejects values that would request the Next app origin and 404 (e.g. bare `/vendor-media/...`, localhost copies).
 */
export function isMarketingBannerImageUrlAllowedForSave(raw: string | null | undefined): boolean {
  const t = typeof raw === 'string' ? raw.trim() : '';
  if (!t) return false;
  if (/^(data|blob):/i.test(t)) return false;
  if (t.startsWith('//')) return false;

  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      const host = u.hostname.toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1') return false;
      if (SUPABASE_HOST && host === SUPABASE_HOST) return true;
      return /^https:\/\//i.test(t);
    } catch {
      return false;
    }
  }

  const p = t.startsWith('/') ? t : `/${t}`;
  if (p.startsWith('/banners/')) return true;
  if (p.startsWith('/brand/')) return true;
  return false;
}

export function marketingBannerImageUrlSaveErrorMessage(): string {
  return 'Image must be a full https URL (e.g. Supabase Storage after upload) or a site path starting with /banners/ or /brand/. Do not use http://localhost or bare /vendor-media/ paths.';
}
