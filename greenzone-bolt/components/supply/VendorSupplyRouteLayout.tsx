'use client';

import { VendorSupplyGate } from '@/components/supply/VendorSupplyGate';
import { VendorSupplyShell } from '@/components/supply/VendorSupplyShell';

export function VendorSupplyRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <VendorSupplyGate>
      <VendorSupplyShell>{children}</VendorSupplyShell>
    </VendorSupplyGate>
  );
}
