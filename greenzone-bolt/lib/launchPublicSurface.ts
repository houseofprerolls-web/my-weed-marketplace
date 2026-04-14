/**
 * Soft-launch: show only approved-onboard shops on the public map, Discover, dispensary directory, etc.
 *
 * Set `NEXT_PUBLIC_LAUNCH_VENDOR_SLUGS` to a comma-separated list of `vendors.slug` values
 * (e.g. `greenhaven,house-of-prerolls,ca-uls-c9-0000568-lic`). When unset or empty, the filter is off
 * and all live approved vendors appear as today.
 *
 * Admins still use the dashboard against real data; this only affects public discovery payloads.
 */

import type { DiscoveryVendor } from '@/lib/publicVendors';

function normalizeAllowlistToken(s: string): string {
  return s.trim().toLowerCase();
}

/** Lowercase slugs from env; `null` = allowlist disabled (show full directory). */
export function parseLaunchVendorAllowlist(): string[] | null {
  const raw = process.env.NEXT_PUBLIC_LAUNCH_VENDOR_SLUGS?.trim();
  if (!raw) return null;
  const parts = raw
    .split(/[,;]/)
    .map((s) => normalizeAllowlistToken(s))
    .filter(Boolean);
  if (parts.length === 0) return null;
  return parts;
}

export function isPublicLaunchVendorAllowlistActive(): boolean {
  return parseLaunchVendorAllowlist() != null;
}

/** Match by `vendors.slug` only (stable for launch). */
export function vendorSlugAllowedForPublicLaunch(slug: string | null | undefined): boolean {
  const allow = parseLaunchVendorAllowlist();
  if (!allow) return true;
  const s = normalizeAllowlistToken(slug || '');
  return s.length > 0 && allow.includes(s);
}

export function filterDiscoveryVendorsForLaunch(vendors: DiscoveryVendor[]): DiscoveryVendor[] {
  if (!isPublicLaunchVendorAllowlistActive()) return vendors;
  return vendors.filter((v) => vendorSlugAllowedForPublicLaunch(v.slug));
}
