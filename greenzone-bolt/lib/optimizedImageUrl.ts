/**
 * Supabase Storage image transformations (optional).
 * @see https://supabase.com/docs/guides/storage/serving/image-transformations
 *
 * Transforms are **off by default**. Set `NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM=1` only if your
 * project has Image Transformations enabled and you want `/render/image` URLs (smaller payloads).
 * Leaving them on when the pipeline mis-decodes files yields flat/grey images with HTTP 200, so
 * `<img onError>` never recovers.
 */

export type ImageOptimizePreset = 'thumb' | 'card' | 'hero' | 'feed' | 'logo';

const PRESETS: Record<
  ImageOptimizePreset,
  { width: number; quality: number; resize: 'cover' | 'contain'; height?: number }
> = {
  thumb: { width: 192, quality: 76, resize: 'cover' },
  card: { width: 512, quality: 78, resize: 'cover' },
  hero: { width: 1024, quality: 80, resize: 'cover' },
  /** Smaller for feed scroll performance (Supabase render URLs). */
  feed: { width: 640, quality: 72, resize: 'cover' },
  /** Logos / avatars in small list cards — `contain` + height so the full mark fits. */
  logo: { width: 192, height: 192, quality: 76, resize: 'contain' },
};

function transformsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM === '1';
}

/**
 * Weedmaps avatar URLs often include `blur=500` and tiny `w`/`h` — they look like grey smudges at full size.
 */
export function sanitizeDisplayImageUrl(url: string | null | undefined): string {
  const raw = String(url ?? '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    if (!u.hostname.includes('weedmaps.com')) return raw;
    u.searchParams.delete('blur');
    u.searchParams.delete('q');
    const w = parseInt(u.searchParams.get('w') || '0', 10);
    const h = parseInt(u.searchParams.get('h') || '0', 10);
    if (w > 0 && w < 320) {
      u.searchParams.set('w', '512');
      u.searchParams.set('h', '512');
    } else if (h > 0 && h < 320 && !u.searchParams.has('w')) {
      u.searchParams.set('w', '512');
      u.searchParams.set('h', '512');
    }
    return u.toString();
  } catch {
    return raw;
  }
}

/**
 * If URL is a Supabase public object URL, return the render endpoint with width/quality.
 * Otherwise return null (caller keeps original).
 */
export function supabaseRenderImageUrl(
  url: string,
  width: number,
  quality: number,
  resize: 'cover' | 'contain' = 'cover',
  height?: number
): string | null {
  const trimmed = url.trim();
  if (!trimmed || !transformsEnabled()) return null;

  const withoutQuery = trimmed.split('?')[0];

  let parsed: URL;
  try {
    parsed = new URL(withoutQuery);
  } catch {
    return null;
  }

  const segs = parsed.pathname.split('/').filter(Boolean);
  const i = segs.indexOf('public');
  if (i < 0 || i + 2 >= segs.length) return null;
  if (segs[0] !== 'storage' || segs[1] !== 'v1' || segs[2] !== 'object') return null;

  const bucket = segs[i + 1];
  const objectPath = segs.slice(i + 2).join('/');
  if (!bucket || !objectPath) return null;

  const encodedPath = objectPath
    .split('/')
    .map((p) => encodeURIComponent(decodeURIComponent(p)))
    .join('/');

  const origin = `${parsed.protocol}//${parsed.host}`;
  const h = height != null ? `&height=${height}` : '';
  return `${origin}/storage/v1/render/image/public/${bucket}/${encodedPath}?width=${width}&quality=${quality}&resize=${resize}${h}`;
}

export function optimizedImageUrl(
  url: string | null | undefined,
  preset: ImageOptimizePreset = 'card'
): string {
  const raw = sanitizeDisplayImageUrl(url);
  if (!raw) return '';
  const { width, quality, resize, height } = PRESETS[preset];
  const rendered = supabaseRenderImageUrl(raw, width, quality, resize, height);
  return rendered ?? raw;
}

export function hasSupabaseTransformVariant(url: string | null | undefined): boolean {
  const raw = sanitizeDisplayImageUrl(url);
  if (!raw || !transformsEnabled()) return false;
  return supabaseRenderImageUrl(raw, PRESETS.card.width, PRESETS.card.quality, PRESETS.card.resize) != null;
}
