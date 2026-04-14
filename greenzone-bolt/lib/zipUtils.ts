/** Extract first 5 digits from messy user input (city names return ''). */
export function extractZip5(input: string | null | undefined): string | null {
  if (!input) return null;
  const d = input.replace(/\D/g, '');
  if (d.length < 5) return null;
  return d.slice(0, 5);
}

export function zipPrefix3(zip5: string | null | undefined): string | null {
  if (!zip5 || zip5.length < 3) return null;
  return zip5.slice(0, 3);
}

/**
 * Lower is better. Same 3-digit region → distance of full ZIPs; else penalize by prefix gap.
 */
export function zipProximityRank(userZip5: string | null, vendorZip: string | null | undefined): number {
  const u = userZip5 && userZip5.length === 5 ? userZip5 : null;
  const v = extractZip5(vendorZip || '');
  if (!u || !v) return 500_000;
  const up = u.slice(0, 3);
  const vp = v.slice(0, 3);
  const uNum = parseInt(u, 10);
  const vNum = parseInt(v, 10);
  if (up === vp) return Math.abs(uNum - vNum);
  return 100_000 + Math.abs(parseInt(up, 10) - parseInt(vp, 10)) * 1_000;
}
