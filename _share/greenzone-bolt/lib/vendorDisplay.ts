import type { VendorBusinessRow } from '@/hooks/useVendorBusiness';

/** City, state, or ZIP for vendor header / analytics labels */
export function formatVendorArea(v: Pick<VendorBusinessRow, 'city' | 'state' | 'zip'>): string {
  const line = [v.city, v.state].filter(Boolean).join(', ');
  if (line) return line;
  const z = v.zip?.trim();
  if (z) {
    const d = z.replace(/\D/g, '').slice(0, 5);
    return d.length === 5 ? `ZIP ${d}` : `ZIP ${z}`;
  }
  return 'Area not set on profile';
}
