/**
 * Removes "equity retailer(s)" from dispensary names (brackets, parens, trailing dash/pipe)
 * so the Social equity badge can stand in on public surfaces.
 */
const EQUITY_RETAILER_TRAILING =
  /\s*[-–—|]?\s*\(?\s*equity\s+retailers?\s*\)?\s*$/i;
const EQUITY_RETAILER_BRACKETS = /\s*\[\s*equity\s+retailers?\s*\]\s*/gi;
const EQUITY_RETAILER_PARENS_INLINE = /\(\s*equity\s+retailers?\s*\)/gi;

const EQUITY_RETAILER_PHRASE = /\bequity\s+retailers?\b/i;

/** True when the raw DB `vendors.name` still contains an equity retailer designation. */
export function rawVendorNameIndicatesSocialEquity(name: string | null | undefined): boolean {
  return EQUITY_RETAILER_PHRASE.test(String(name ?? ''));
}

/** Public badge: DB opt-in or legacy phrase still present in raw name (before strip). */
export function resolveSocialEquityBadgeVisible(
  rawName: string | null | undefined,
  dbFlag: boolean | null | undefined
): boolean {
  if (dbFlag === true) return true;
  return rawVendorNameIndicatesSocialEquity(rawName);
}

export function stripEquityRetailerSuffixFromName(name: string): string {
  let s = name.trim();
  let prev = '';
  while (s !== prev) {
    prev = s;
    s = s.replace(EQUITY_RETAILER_BRACKETS, ' ').trim();
    s = s.replace(EQUITY_RETAILER_PARENS_INLINE, ' ').trim();
    s = s.replace(EQUITY_RETAILER_TRAILING, '').trim();
    s = s.replace(/\s+/g, ' ').trim();
  }
  return s;
}

/** Customer-facing store title from raw DB `vendors.name`. */
export function publicVendorDisplayName(name: string | null | undefined): string {
  return stripEquityRetailerSuffixFromName(String(name ?? ''));
}
