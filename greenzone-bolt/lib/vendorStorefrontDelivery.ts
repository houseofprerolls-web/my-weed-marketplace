/**
 * Public discovery rules (aligned with DB trigger on `vendors`):
 * - `admin_service_mode = force_delivery` → delivery-only.
 * - `admin_service_mode = force_storefront` → storefront-only.
 * - `allow_both_storefront_and_delivery` → both lanes when not forced.
 * - `admin_service_mode = auto` (default): **no full street address** → delivery-only;
 *   **full address** → storefront-only.
 *
 * Map and discovery UIs read `offers_delivery` / `offers_storefront` from
 * `resolvePublicVendorServiceModes`. To show both lanes for a shop that has a full
 * address but also runs delivery, set `allow_both_storefront_and_delivery` or use
 * `force_delivery` / `force_storefront` as needed.
 */

export type AdminVendorServiceMode = 'auto' | 'force_delivery' | 'force_storefront';

export function normalizeAdminVendorServiceMode(x: unknown): AdminVendorServiceMode {
  const s = String(x ?? 'auto').trim().toLowerCase();
  if (s === 'force_delivery') return 'force_delivery';
  if (s === 'force_storefront') return 'force_storefront';
  return 'auto';
}

export function hasFullStoreAddress(v: {
  address?: string | null | undefined;
  city?: string | null | undefined;
  state?: string | null | undefined;
}): boolean {
  const street = String(v.address ?? '').trim();
  const city = String(v.city ?? '').trim();
  const state = String(v.state ?? '').trim();
  return street.length > 0 && city.length > 0 && state.length > 0;
}

export type VendorServiceModeInput = {
  address?: string | null | undefined;
  city?: string | null | undefined;
  state?: string | null | undefined;
  zip?: string | null | undefined;
  offers_delivery?: boolean | null | undefined;
  offers_storefront?: boolean | null | undefined;
  /** When true (and admin mode is auto), public listings show both lanes. */
  allow_both_storefront_and_delivery?: boolean | null | undefined;
  /** `vendor_profiles` legacy name for pickup / storefront */
  offers_pickup?: boolean | null | undefined;
  /** CannaHub `vendors.admin_service_mode` — admin override for listings. */
  admin_service_mode?: string | null | undefined;
};

export function resolvePublicVendorServiceModes(
  row: VendorServiceModeInput
): { offers_delivery: boolean; offers_storefront: boolean } {
  const adminMode = normalizeAdminVendorServiceMode(row.admin_service_mode);
  if (adminMode === 'force_delivery') {
    return { offers_storefront: false, offers_delivery: true };
  }
  if (adminMode === 'force_storefront') {
    return { offers_storefront: true, offers_delivery: false };
  }
  if (row.allow_both_storefront_and_delivery === true) {
    return { offers_delivery: true, offers_storefront: true };
  }
  if (!hasFullStoreAddress(row)) {
    return { offers_storefront: false, offers_delivery: true };
  }
  return { offers_storefront: true, offers_delivery: false };
}

/** True when public listings are storefront / pickup only (no delivery lane). */
export function isStorefrontOnlyVendor(row: VendorServiceModeInput): boolean {
  const m = resolvePublicVendorServiceModes(row);
  return m.offers_storefront === true && m.offers_delivery === false;
}

/** Visual hint for admin dashboard / vendor cards. */
export type AdminPublicServiceModeBadgeVariant =
  | 'delivery'
  | 'storefront'
  | 'both'
  | 'neutral';

export type AdminPublicServiceModeBadge = {
  label: string;
  variant: AdminPublicServiceModeBadgeVariant;
};

/**
 * Labels for admin UI: always states the effective public lane(s), including
 * `Auto · Delivery` vs `Auto · Storefront` from address rules.
 */
export function adminVendorPublicServiceModeBadges(
  row: VendorServiceModeInput & { service_mode_locked?: boolean | null }
): AdminPublicServiceModeBadge[] {
  const out: AdminPublicServiceModeBadge[] = [];
  const adminMode = normalizeAdminVendorServiceMode(row.admin_service_mode);
  const modes = resolvePublicVendorServiceModes(row);

  if (adminMode === 'force_delivery') {
    out.push({ label: 'Force · Delivery', variant: 'delivery' });
  } else if (adminMode === 'force_storefront') {
    out.push({ label: 'Force · Storefront', variant: 'storefront' });
  } else if (row.allow_both_storefront_and_delivery === true) {
    out.push({ label: 'Both lanes', variant: 'both' });
  } else if (modes.offers_delivery && modes.offers_storefront) {
    out.push({ label: 'Auto · Delivery & storefront', variant: 'both' });
  } else if (modes.offers_delivery) {
    out.push({ label: 'Auto · Delivery', variant: 'delivery' });
  } else {
    out.push({ label: 'Auto · Storefront', variant: 'storefront' });
  }

  if (row.service_mode_locked === false) {
    out.push({ label: 'Lanes unlocked', variant: 'neutral' });
  }

  return out;
}

export function adminVendorPublicServiceModeBadgeClassName(
  variant: AdminPublicServiceModeBadgeVariant
): string {
  switch (variant) {
    case 'delivery':
      return 'border-sky-700/55 bg-sky-950/40 text-sky-100';
    case 'storefront':
      return 'border-violet-700/55 bg-violet-950/40 text-violet-100';
    case 'both':
      return 'border-emerald-700/55 bg-emerald-950/40 text-emerald-100';
    default:
      return 'border-zinc-600/55 bg-zinc-900/50 text-zinc-200';
  }
}
