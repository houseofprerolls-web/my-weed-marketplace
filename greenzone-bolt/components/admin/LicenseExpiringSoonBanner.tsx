'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useRole } from '@/hooks/useRole';
import { useVendorsSchema } from '@/contexts/VendorsSchemaContext';
import { LICENSE_EXPIRING_SOON_DAYS, licenseExpiringSoonRangeUtc } from '@/lib/adminLicenseExpiry';
import { AlertCircle } from 'lucide-react';

/**
 * Admin alert: `business_licenses.expiry_date` within LICENSE_EXPIRING_SOON_DAYS (links to vendor list filter).
 */
export function LicenseExpiringSoonBanner() {
  const { isAdmin } = useRole();
  const vendorsSchema = useVendorsSchema();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isAdmin || !vendorsSchema) {
      setCount(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { fromIsoDate, toIsoDate } = licenseExpiringSoonRangeUtc();
      const { count: c, error } = await supabase
        .from('business_licenses')
        .select('id', { count: 'exact', head: true })
        .not('expiry_date', 'is', null)
        .gte('expiry_date', fromIsoDate)
        .lte('expiry_date', toIsoDate);
      if (cancelled) return;
      if (error) {
        setCount(0);
        return;
      }
      setCount(typeof c === 'number' ? c : 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, vendorsSchema]);

  if (!vendorsSchema || !isAdmin || count == null || count < 1) return null;

  return (
    <Card className="mb-6 border-amber-800/40 bg-amber-950/25 p-4 text-amber-100/95">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden />
          <div>
            <p className="font-semibold text-white">License renewals due soon</p>
            <p className="mt-1 text-sm text-amber-100/85">
              {count} business license{count === 1 ? '' : 's'} ha{count === 1 ? 's' : 've'} an expiry on file within the
              next {LICENSE_EXPIRING_SOON_DAYS} days (today through the window end). Update dates in Vendor control →
              License after renewals.
            </p>
          </div>
        </div>
        <Button
          asChild
          size="sm"
          className="shrink-0 border-amber-600/50 bg-amber-600/20 text-amber-100 hover:bg-amber-600/30"
          variant="outline"
        >
          <Link href="/admin/vendors?licenseExpiringSoon=1">View in vendor list</Link>
        </Button>
      </div>
    </Card>
  );
}
