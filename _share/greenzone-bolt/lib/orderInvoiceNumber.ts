/** Matches `0052_order_invoice_numbers_and_vendor_visibility.sql` charset (letters + digits). */

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function token(len: number): string {
  let s = '';
  for (let i = 0; i < len; i += 1) {
    s += CHARSET[Math.floor(Math.random() * CHARSET.length)]!;
  }
  return s;
}

/** Client-side invoice id; DB trigger still fills `order_number` when omitted. */
export function generateClientInvoiceNumber(): string {
  return `INV-${token(4)}-${token(4)}`;
}
