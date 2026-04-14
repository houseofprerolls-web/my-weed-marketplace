import type { VendorProfile } from '@/lib/types/database';

/** Quick-filter chips on /dispensaries (aligned with former Discover filters). */
export type DirectoryChipId =
  | 'open'
  | 'rated'
  | 'deals'
  | 'freeDel'
  | 'onlineOrder'
  | 'storefront'
  | 'delivery';

export const DIRECTORY_CHIP_META: { id: DirectoryChipId; label: string }[] = [
  { id: 'open', label: 'Open now' },
  { id: 'rated', label: '4+ stars' },
  { id: 'freeDel', label: 'Free delivery' },
  { id: 'deals', label: 'Deals' },
  { id: 'onlineOrder', label: 'Online ordering' },
  { id: 'storefront', label: 'Storefront' },
  { id: 'delivery', label: 'Delivery' },
];

export function isDirectoryVendorOpenNow(vendorId: string): boolean {
  const hour = new Date().getHours();
  return hour >= 9 && hour < 22;
}

export function directoryChipPasses(b: VendorProfile, id: DirectoryChipId): boolean {
  switch (id) {
    case 'open':
      return isDirectoryVendorOpenNow(b.id);
    case 'rated':
      return (b.average_rating ?? 0) >= 4;
    case 'deals':
      return (b.active_deals_count ?? 0) > 0;
    case 'freeDel':
      return (b.delivery_fee ?? 0) === 0;
    case 'onlineOrder':
      return b.online_menu_enabled === true;
    case 'storefront':
      return b.offers_pickup === true;
    case 'delivery':
      return b.offers_delivery === true;
    default:
      return true;
  }
}

export function filterDirectoryBySearchQuery(
  list: VendorProfile[],
  searchQuery: string
): VendorProfile[] {
  const raw = searchQuery.trim();
  if (!raw) return list;

  const digitOnly = raw.replace(/\D/g, '');
  const zipish = /^\d[\d\s-]*$/.test(raw) && digitOnly.length >= 1;

  if (zipish) {
    const prefix = digitOnly.slice(0, 5);
    return list.filter((v) => {
      const vz = (v.zip_code || '').replace(/\D/g, '');
      return vz.startsWith(prefix);
    });
  }

  const tokens = raw.toLowerCase().split(/\s+/).filter(Boolean);

  return list.filter((v) => {
    const blob = [v.business_name, v.city, v.state, v.address, v.slug ?? '']
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const zipNorm = (v.zip_code || '').replace(/\D/g, '');

    return tokens.every((t) => {
      if (/^\d+$/.test(t)) return zipNorm.includes(t) || blob.includes(t);
      return blob.includes(t);
    });
  });
}

export function filterDirectoryByChips(
  list: VendorProfile[],
  activeChips: Set<DirectoryChipId>
): VendorProfile[] {
  let filtered = [...list];
  activeChips.forEach((id) => {
    filtered = filtered.filter((v) => directoryChipPasses(v, id));
  });
  return filtered;
}
