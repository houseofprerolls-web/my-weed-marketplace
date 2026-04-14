'use client';

import Link from 'next/link';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useRole } from '@/hooks/useRole';

function hasApprovedLicense(
  vendors: { license_status: string }[]
): boolean {
  return vendors.some((v) => String(v.license_status || '').toLowerCase() === 'approved');
}

/**
 * Footer link to vendor advertising rates — only rendered for platform admins
 * or users tied to at least one license-approved shop (owner or team).
 */
export function FooterVendorAdvertisingPricingLink() {
  const { isAdmin, loading: roleLoading } = useRole();
  const { ownedVendors, loading: vendorLoading } = useVendorBusiness();

  if (roleLoading || vendorLoading) return null;
  if (!isAdmin && !hasApprovedLicense(ownedVendors)) return null;

  return (
    <li>
      <Link href="/pricing/advertising" className="hover:text-white transition-colors">
        Vendor advertising &amp; placement rates
      </Link>
    </li>
  );
}
