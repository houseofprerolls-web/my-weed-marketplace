'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { isVendorsSchema } from '@/lib/vendorSchema';

const VendorsSchemaContext = createContext<boolean | null>(null);

/**
 * Wrap the app (from root layout) with `value={resolveUseVendorsTableForDiscovery()}` so client
 * code matches `/api/discovery/vendors` and server routes that read `USE_VENDORS_TABLE`.
 */
export function VendorsSchemaProvider({
  value,
  children,
}: {
  value: boolean;
  children: ReactNode;
}) {
  return (
    <VendorsSchemaContext.Provider value={value}>{children}</VendorsSchemaContext.Provider>
  );
}

/**
 * Prefer this over `isVendorsSchema()` in client components — honors `USE_VENDORS_TABLE` from the host.
 */
export function useVendorsSchema(): boolean {
  const ctx = useContext(VendorsSchemaContext);
  if (ctx !== null) return ctx;
  return isVendorsSchema();
}
