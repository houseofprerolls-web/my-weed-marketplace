/**
 * Vendor-only B2B supply exchange (RFQ). Off unless explicitly disabled with 0/false.
 */
export function isSupplyExchangeEnabled(): boolean {
  const v = (process.env.NEXT_PUBLIC_SUPPLY_EXCHANGE ?? '').trim().toLowerCase();
  if (v === '0' || v === 'false' || v === 'off') return false;
  return true;
}
