import type { PostgrestError } from '@supabase/supabase-js';

export const MARKETING_SLIDE_SELECT_BASE =
  'id,vendor_id,placement_key,title,image_url,link_url,sort_order,status,admin_note,created_at,updated_at,listing_market_id';

export const MARKETING_SLIDE_SELECT_FULL = `${MARKETING_SLIDE_SELECT_BASE},creative_format`;

type ErrLike = Pick<PostgrestError, 'message' | 'details' | 'hint'> | null | undefined;

function errText(err: ErrLike): string {
  if (!err) return '';
  const e = err as PostgrestError;
  return `${e.message ?? ''} ${e.details ?? ''} ${e.hint ?? ''}`.toLowerCase();
}

/** PostgREST / Postgres when `creative_format` was never migrated (0168). */
export function isMissingCreativeFormatColumnError(err: ErrLike): boolean {
  const m = errText(err);
  if (!m.includes('creative_format')) return false;
  return (
    m.includes('does not exist') ||
    m.includes('undefined column') ||
    (m.includes('column') && m.includes('not found')) ||
    m.includes('could not find') ||
    (m.includes('schema cache') && m.includes('column'))
  );
}

/** Table missing or not exposed (0167 not applied / schema cache). */
export function isMarketingBannerSlidesTableMissingError(err: ErrLike): boolean {
  const m = errText(err);
  if (!m.includes('marketing_banner_slides')) return false;
  // "column … does not exist" is a missing column (e.g. 0168), not a missing table
  if (/column\s+[\w.]+\s+does not exist/.test(m)) return false;
  // PostgREST: "Could not find the 'creative_format' column of 'marketing_banner_slides' in the schema cache"
  if (m.includes('could not find') && m.includes('column') && m.includes('marketing_banner_slides')) {
    return false;
  }
  return (
    m.includes('schema cache') ||
    (m.includes('relation') && m.includes('does not exist')) ||
    m.includes('could not find')
  );
}

/** User-facing fix for admin / logs when load fails. */
export function marketingBannerSlidesLoadErrorHint(err: PostgrestError | null): string | null {
  if (!err) return null;
  if (isMissingCreativeFormatColumnError(err)) {
    return 'Column creative_format is missing on marketing_banner_slides. Apply migration 0168_marketing_banner_slides_creative_format.sql (or 0176_ensure_marketing_banner_creative_format.sql), run supabase db push, then Supabase Dashboard → Settings → API → Reload schema.';
  }
  if (isMarketingBannerSlidesTableMissingError(err)) {
    return 'The marketing_banner_slides table is missing or not in the API schema. Apply migration 0167_marketing_banner_slides.sql (e.g. supabase db push), then reload the page.';
  }
  return null;
}
