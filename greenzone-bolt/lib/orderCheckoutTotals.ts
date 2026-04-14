/**
 * Single source for merchandise tax + order total math used at checkout and when vendors adjust line items.
 * Tax applies to merchandise subtotal only (not delivery), matching `app/cart/page.tsx` behavior.
 */
export const CHECKOUT_MERCHANDISE_TAX_RATE = 0.09;

export function merchandiseTaxCentsFromSubtotalCents(subtotalCents: number): number {
  return Math.round(subtotalCents * CHECKOUT_MERCHANDISE_TAX_RATE);
}

export function totalsFromSubtotalAndDeliveryCents(subtotalCents: number, deliveryFeeCents: number) {
  const taxCents = merchandiseTaxCentsFromSubtotalCents(subtotalCents);
  const totalCents = subtotalCents + deliveryFeeCents + taxCents;
  return {
    taxCents,
    salesTaxCents: taxCents,
    exciseTaxCents: 0,
    totalCents,
  };
}
