/** Default carousel slide when no DB rows — same treehouse mark as header (`public/brand`). */
export const TREEHOUSE_CAROUSEL_LOGO_URL = '/brand/datreehouse-logo.png';

/** Pixel size of `public/brand/datreehouse-logo.png` (final brand asset). */
export const DATREEHOUSE_LOGO_PX_WIDTH = 1024;
export const DATREEHOUSE_LOGO_PX_HEIGHT = 1024;

/** Default CTA for platform treehouse banners — discovery hub. */
export const TREEHOUSE_CAROUSEL_HREF = '/discover';

export function isTreehouseCarouselLogoUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const u = url.trim().toLowerCase();
  if (u === TREEHOUSE_CAROUSEL_LOGO_URL.toLowerCase()) return true;
  return (
    u.endsWith('/datreehouse-logo.png') ||
    u.includes('datreehouse-logo.png') ||
    u.endsWith('/datreehouse-logo.svg') ||
    u.includes('datreehouse-logo.svg')
  );
}
