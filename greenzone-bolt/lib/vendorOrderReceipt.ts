import { jsPDF } from 'jspdf';
import { SITE_NAME } from '@/lib/brand';
import { lineQuantity, lineUnitPriceCents, orderItemsArray } from '@/lib/orderProfit';
import { orderStatusLabel } from '@/lib/orderFulfillmentStatus';
import { CHECKOUT_MERCHANDISE_TAX_RATE } from '@/lib/orderCheckoutTotals';
import { TREEHOUSE_CAROUSEL_LOGO_URL } from '@/lib/treehouseCarouselAsset';

export type VendorOrderReceiptPayload = {
  storeName?: string | null;
  /** Public URL for the dispensary logo (https, or site-relative `/…` in browser). */
  storeLogoUrl?: string | null;
  orderNumber: string | null;
  orderId: string;
  createdAt: string;
  status: string;
  pickupOrDelivery?: string | null;
  scheduledFor?: string | null;
  items: unknown;
  subtotalCents?: number | null;
  deliveryFeeCents?: number | null;
  salesTaxCents?: number | null;
  exciseTaxCents?: number | null;
  taxCents?: number | null;
  totalCents: number;
  fulfillmentNotes?: string | null;
  deliveryAddress?: string | null;
  deliveryCity?: string | null;
  deliveryZip?: string | null;
  customerPhone?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
};

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
  }
  return btoa(binary);
}

function resolveReceiptImageUrl(url: string | null | undefined): string | null {
  const u = url?.trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('//')) return `https:${u}`;
  if (typeof window !== 'undefined' && u.startsWith('/')) return `${window.location.origin}${u}`;
  return null;
}

async function loadTreehouseLogoDataUrl(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const url = `${window.location.origin}${TREEHOUSE_CAROUSEL_LOGO_URL}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return `data:image/png;base64,${arrayBufferToBase64(buf)}`;
  } catch {
    return null;
  }
}

/** Fetches a remote image for jsPDF (PNG or JPEG only). */
async function loadImageDataUrlForPdf(absoluteUrl: string): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG' } | null> {
  try {
    const res = await fetch(absoluteUrl, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 4_000_000) return null;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const b64 = arrayBufferToBase64(buf);
    if (ct.includes('jpeg') || ct.includes('jpg')) {
      return { dataUrl: `data:image/jpeg;base64,${b64}`, format: 'JPEG' };
    }
    if (ct.includes('png')) {
      return { dataUrl: `data:image/png;base64,${b64}`, format: 'PNG' };
    }
    const u8 = new Uint8Array(buf);
    if (u8.length >= 2 && u8[0] === 0xff && u8[1] === 0xd8) {
      return { dataUrl: `data:image/jpeg;base64,${b64}`, format: 'JPEG' };
    }
    if (u8.length >= 8 && u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47) {
      return { dataUrl: `data:image/png;base64,${b64}`, format: 'PNG' };
    }
    return null;
  } catch {
    return null;
  }
}

function receiptTaxRows(p: VendorOrderReceiptPayload): { label: string; cents: number }[] {
  const sales = p.salesTaxCents ?? 0;
  const excise = p.exciseTaxCents ?? 0;
  const combined = p.taxCents ?? sales + excise;
  if (excise > 0) {
    const rows: { label: string; cents: number }[] = [];
    if (sales > 0) rows.push({ label: 'Sales tax', cents: sales });
    rows.push({ label: 'Excise tax', cents: excise });
    return rows;
  }
  if (sales > 0) {
    const pct = CHECKOUT_MERCHANDISE_TAX_RATE * 100;
    return [{ label: `Sales tax (${pct.toFixed(0)}%)`, cents: sales }];
  }
  if (combined > 0) {
    return [{ label: 'Tax', cents: combined }];
  }
  return [];
}

export function computeReceiptSubtotalCents(items: unknown): number {
  return orderItemsArray(items).reduce((sum, line) => {
    return sum + lineUnitPriceCents(line) * lineQuantity(line);
  }, 0);
}

export function vendorReceiptPdfBaseName(p: VendorOrderReceiptPayload): string {
  const n = p.orderNumber?.trim();
  if (n) return `receipt_${n.replace(/\s+/g, '_')}`;
  return `receipt_${p.orderId.slice(0, 8)}`;
}

export async function buildVendorOrderReceiptPdfBlob(p: VendorOrderReceiptPayload): Promise<Blob> {
  const vendorAbs = resolveReceiptImageUrl(p.storeLogoUrl);
  const [treehouseDataUrl, vendorImg] = await Promise.all([
    loadTreehouseLogoDataUrl(),
    vendorAbs ? loadImageDataUrlForPdf(vendorAbs) : Promise.resolve(null),
  ]);

  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 48;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - margin * 2;
  const xRight = pageW - margin;
  const treeW = 44;
  const treeH = 44;
  const treeX = xRight - treeW;
  const storeLogoSize = 42;
  const storeLogoGap = 12;
  const textStartX = margin + (vendorImg ? storeLogoSize + storeLogoGap : 0);
  const titleMaxW = treeX - textStartX - 12;

  let y = margin;

  function need(h: number) {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  }

  if (vendorImg) {
    try {
      doc.addImage(vendorImg.dataUrl, vendorImg.format, margin, margin - 4, storeLogoSize, storeLogoSize);
    } catch {
      /* optional */
    }
  }

  if (treehouseDataUrl) {
    try {
      doc.addImage(treehouseDataUrl, 'PNG', treeX, margin - 4, treeW, treeH);
    } catch {
      /* optional mark */
    }
  }

  const vendorTitle = p.storeName?.trim() || 'Dispensary';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(20, 20, 20);
  const titleLines = doc.splitTextToSize(vendorTitle, titleMaxW);
  need(titleLines.length * 24 + 36);
  for (const ln of titleLines) {
    doc.text(ln, textStartX, y + 14);
    y += 24;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('ORDER RECEIPT', textStartX, y + 4);
  doc.setTextColor(0, 0, 0);
  y += 22;

  doc.setDrawColor(220);
  doc.line(margin, y, xRight, y);
  y += 18;

  const col2 = margin + maxW * 0.48;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('ORDER DETAILS', margin, y);
  doc.text('CUSTOMER', col2, y);
  y += 12;

  doc.setFontSize(9.5);
  doc.setTextColor(35, 35, 35);
  doc.setFont('helvetica', 'bold');
  doc.text(`#${p.orderNumber?.trim() || p.orderId.slice(0, 8)}`, margin, y);
  doc.setFont('helvetica', 'normal');
  const custHead =
    p.customerName?.trim() ||
    p.customerEmail?.trim() ||
    p.customerPhone?.trim() ||
    '—';
  doc.text(custHead.length > 42 ? `${custHead.slice(0, 39)}…` : custHead, col2, y);
  y += 13;

  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Placed ${new Date(p.createdAt).toLocaleString()}`, margin, y);
  if (p.customerEmail?.trim() && p.customerName?.trim()) {
    doc.text(p.customerEmail.trim(), col2, y);
  } else if (p.customerPhone?.trim()) {
    doc.text(`Phone ${p.customerPhone.trim()}`, col2, y);
  }
  y += 13;

  doc.text(`Status · ${orderStatusLabel(p.status)}`, margin, y);
  if (p.pickupOrDelivery?.trim()) {
    doc.text(p.pickupOrDelivery.trim(), col2, y);
  }
  y += 13;

  if (p.scheduledFor) {
    doc.text(`Scheduled · ${new Date(p.scheduledFor).toLocaleString()}`, margin, y);
    y += 13;
  }

  doc.text(`Order ID · ${p.orderId}`, margin, y);
  y += 16;

  doc.setTextColor(120, 120, 120);
  doc.setFontSize(8);
  doc.text('FULFILLMENT ADDRESS', margin, y);
  y += 11;
  doc.setFontSize(9);
  doc.setTextColor(55, 55, 55);
  if (p.deliveryAddress?.trim()) {
    const addrLines = doc.splitTextToSize(
      `${p.deliveryAddress.trim()}${p.deliveryCity || p.deliveryZip ? ` · ${[p.deliveryCity, p.deliveryZip].filter(Boolean).join(', ')}` : ''}`,
      maxW
    );
    need(addrLines.length * 12 + 8);
    for (const ln of addrLines) {
      doc.text(ln, margin, y);
      y += 12;
    }
  } else {
    doc.text('—', margin, y);
    y += 12;
  }

  y += 10;
  doc.setDrawColor(235);
  doc.line(margin, y, xRight, y);
  y += 16;

  const xAmt = xRight;
  const xUnit = xRight - 78;
  const xQty = xRight - 138;
  const nameW = xQty - margin - 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('ITEM', margin, y);
  doc.text('QTY', xQty, y, { align: 'right' });
  doc.text('UNIT', xUnit, y, { align: 'right' });
  doc.text('AMOUNT', xAmt, y, { align: 'right' });
  y += 8;
  doc.setDrawColor(230);
  doc.line(margin, y, xRight, y);
  y += 14;

  const lines = orderItemsArray(p.items);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(25, 25, 25);

  if (lines.length === 0) {
    need(20);
    doc.text('No line items on this order.', margin, y);
    y += 18;
  } else {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const q = lineQuantity(line);
      const unit = lineUnitPriceCents(line);
      const lineTotal = unit * q;
      const name = String(line.name ?? line.product_id ?? `Line ${i + 1}`);
      const nameLines = doc.splitTextToSize(name, nameW);
      need(nameLines.length * 12 + 12);

      const baseY = y + 10;
      doc.text(nameLines[0]!, margin, baseY);
      doc.text(String(q), xQty, baseY, { align: 'right' });
      doc.text(money(unit), xUnit, baseY, { align: 'right' });
      doc.text(money(lineTotal), xAmt, baseY, { align: 'right' });
      for (let j = 1; j < nameLines.length; j++) {
        doc.text(nameLines[j]!, margin, baseY + j * 12);
      }

      y += nameLines.length * 12 + 8;
    }
  }

  if (p.fulfillmentNotes?.trim()) {
    y += 6;
    need(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('NOTES', margin, y);
    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(55, 55, 55);
    const noteLines = doc.splitTextToSize(p.fulfillmentNotes.trim(), maxW);
    need(noteLines.length * 12 + 8);
    for (const ln of noteLines) {
      doc.text(ln, margin, y);
      y += 12;
    }
  }

  const subtotal = p.subtotalCents ?? computeReceiptSubtotalCents(p.items);
  const delivery = p.deliveryFeeCents ?? 0;
  const taxRows = receiptTaxRows(p);
  const total = p.totalCents;

  y += 12;
  need(28 + taxRows.length * 16 + 24);
  doc.setDrawColor(200);
  doc.line(margin, y, xRight, y);
  y += 18;

  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);

  function moneyRow(label: string, cents: number, bold = false) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 12 : 10);
    doc.text(label, margin, y);
    doc.text(money(cents), xAmt, y, { align: 'right' });
    y += bold ? 18 : 14;
  }

  moneyRow('Subtotal', subtotal);
  moneyRow('Delivery', delivery);
  for (const row of taxRows) {
    moneyRow(row.label, row.cents);
  }
  y += 4;
  doc.setDrawColor(235);
  doc.line(margin, y - 6, xRight, y - 6);
  moneyRow('Total', total, true);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Powered by ${SITE_NAME}`, margin, pageH - 40);
  doc.text(new Date().toLocaleString(), xAmt, pageH - 40, { align: 'right' });

  return doc.output('blob');
}

export async function downloadVendorOrderReceiptPdf(p: VendorOrderReceiptPayload): Promise<void> {
  const blob = await buildVendorOrderReceiptPdfBlob(p);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${vendorReceiptPdfBaseName(p)}.pdf`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function openVendorOrderReceiptPdfTab(p: VendorOrderReceiptPayload): Promise<Window | null> {
  const blob = await buildVendorOrderReceiptPdfBlob(p);
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank', 'noopener,noreferrer');
  if (w) {
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
  } else {
    URL.revokeObjectURL(url);
  }
  return w;
}

/** Printable HTML receipt in a new tab; triggers the browser print dialog. */
export function openVendorOrderReceiptPrintPreview(p: VendorOrderReceiptPayload): void {
  const subtotal = p.subtotalCents ?? computeReceiptSubtotalCents(p.items);
  const delivery = p.deliveryFeeCents ?? 0;
  const taxRows = receiptTaxRows(p);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const treehouseSrc = origin ? `${origin}${TREEHOUSE_CAROUSEL_LOGO_URL}` : TREEHOUSE_CAROUSEL_LOGO_URL;
  const vendorLogoSrc = resolveReceiptImageUrl(p.storeLogoUrl);

  const itemsHtml = (() => {
    const arr = orderItemsArray(p.items);
    if (!arr.length) return '<tr><td colspan="4" class="muted">No line items.</td></tr>';
    return arr
      .map((line, i) => {
        const q = lineQuantity(line);
        const unit = lineUnitPriceCents(line);
        const total = unit * q;
        const name = escHtml(String(line.name ?? line.product_id ?? `Line ${i + 1}`));
        return `<tr>
          <td class="item-name">${name}</td>
          <td class="num">${q}</td>
          <td class="num">${escHtml(money(unit))}</td>
          <td class="num strong">${escHtml(money(total))}</td>
        </tr>`;
      })
      .join('');
  })();

  const taxRowsHtml = taxRows
    .map((r) => `<div class="tot-row"><span>${escHtml(r.label)}</span><span>${escHtml(money(r.cents))}</span></div>`)
    .join('');

  const vendorName = escHtml(p.storeName?.trim() || 'Dispensary');
  const vendorLogoImg = vendorLogoSrc
    ? `<div class="store-mark"><img src="${escHtml(vendorLogoSrc)}" width="52" height="52" alt=""/></div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Receipt ${escHtml(p.orderNumber?.trim() || p.orderId.slice(0, 8))}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 32px 40px; color: #1a1a1a; font-size: 11pt; line-height: 1.45; }
    .sheet { max-width: 520px; margin: 0 auto; }
    .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 1px solid #ddd; padding-bottom: 16px; margin-bottom: 20px; }
    .brand-row { display: flex; align-items: flex-start; gap: 14px; flex: 1; min-width: 0; }
    .store-mark { flex-shrink: 0; width: 52px; height: 52px; border-radius: 8px; overflow: hidden; background: #f5f5f5; }
    .store-mark img { width: 52px; height: 52px; object-fit: contain; display: block; }
    .brand { flex: 1; min-width: 0; }
    .brand h1 { margin: 0 0 4px; font-size: 1.35rem; font-weight: 700; letter-spacing: 0.02em; line-height: 1.2; }
    .brand .sub { margin: 0; font-size: 0.72rem; font-weight: 600; color: #666; letter-spacing: 0.12em; }
    .mark { flex-shrink: 0; width: 48px; height: 48px; }
    .mark img { width: 48px; height: 48px; object-fit: contain; display: block; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 20px; font-size: 10pt; }
    .grid .lbl { font-size: 0.68rem; font-weight: 600; color: #888; letter-spacing: 0.06em; margin-bottom: 2px; }
    .grid .val { color: #333; }
    .section-title { font-size: 0.68rem; font-weight: 700; color: #888; letter-spacing: 0.08em; margin: 20px 0 8px; }
    table.items { width: 100%; border-collapse: collapse; font-size: 10pt; }
    table.items th { text-align: left; font-size: 0.65rem; font-weight: 700; color: #777; letter-spacing: 0.06em; padding: 0 0 8px; border-bottom: 1px solid #ddd; }
    table.items th:nth-child(n+2) { text-align: right; }
    table.items td { padding: 10px 0; vertical-align: top; border-bottom: 1px solid #eee; }
    table.items td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .item-name { font-weight: 600; padding-right: 12px; }
    .strong { font-weight: 700; }
    .muted { color: #666; }
    .totals { margin-top: 20px; padding-top: 12px; border-top: 1px solid #ccc; max-width: 280px; margin-left: auto; }
    .tot-row { display: flex; justify-content: space-between; gap: 16px; margin: 6px 0; font-size: 10pt; }
    .tot-row.total { margin-top: 12px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 12pt; font-weight: 700; }
    .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #eee; font-size: 8.5pt; color: #999; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    @media print {
      body { padding: 16px 20px; }
      .sheet { max-width: none; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <header class="top">
      <div class="brand-row">
        ${vendorLogoImg}
        <div class="brand">
          <h1>${vendorName}</h1>
          <p class="sub">ORDER RECEIPT</p>
        </div>
      </div>
      <div class="mark"><img src="${escHtml(treehouseSrc)}" width="48" height="48" alt=""/></div>
    </header>

    <div class="grid">
      <div>
        <div class="lbl">ORDER</div>
        <div class="val"><strong>#${escHtml(p.orderNumber?.trim() || p.orderId.slice(0, 8))}</strong></div>
        <div class="val muted" style="margin-top:6px">${escHtml(new Date(p.createdAt).toLocaleString())}</div>
        <div class="val" style="margin-top:6px">Status · ${escHtml(orderStatusLabel(p.status))}</div>
        <div class="val muted" style="margin-top:4px;font-size:9pt">ID ${escHtml(p.orderId)}</div>
      </div>
      <div>
        <div class="lbl">CUSTOMER</div>
        ${p.customerName?.trim() ? `<div class="val">${escHtml(p.customerName.trim())}</div>` : ''}
        ${p.customerEmail?.trim() ? `<div class="val muted" style="margin-top:4px">${escHtml(p.customerEmail.trim())}</div>` : ''}
        ${p.customerPhone?.trim() ? `<div class="val muted" style="margin-top:4px">Phone ${escHtml(p.customerPhone.trim())}</div>` : ''}
        ${!p.customerName?.trim() && !p.customerEmail?.trim() && !p.customerPhone?.trim() ? '<div class="val muted">—</div>' : ''}
      </div>
    </div>

    ${
      p.pickupOrDelivery?.trim() || p.scheduledFor
        ? `<div class="grid" style="grid-template-columns:1fr">
        ${p.pickupOrDelivery?.trim() ? `<div><div class="lbl">FULFILLMENT</div><div class="val">${escHtml(p.pickupOrDelivery)}</div></div>` : ''}
        ${p.scheduledFor ? `<div style="margin-top:8px"><div class="lbl">SCHEDULED</div><div class="val">${escHtml(new Date(p.scheduledFor).toLocaleString())}</div></div>` : ''}
      </div>`
        : ''
    }

    <div class="lbl section-title">ADDRESS</div>
    ${
      p.deliveryAddress?.trim()
        ? `<p style="margin:0 0 16px;font-size:10pt">${escHtml(p.deliveryAddress.trim())}<br/><span class="muted">${escHtml([p.deliveryCity, p.deliveryZip].filter(Boolean).join(', '))}</span></p>`
        : '<p class="muted" style="margin:0 0 16px">—</p>'
    }

    <div class="lbl section-title">ITEMS</div>
    <table class="items" role="grid">
      <thead>
        <tr><th>Item</th><th>Qty</th><th>Unit</th><th>Amount</th></tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>

    ${
      p.fulfillmentNotes?.trim()
        ? `<div class="lbl section-title">NOTES</div><p style="margin:0 0 8px;white-space:pre-wrap;font-size:10pt">${escHtml(p.fulfillmentNotes.trim())}</p>`
        : ''
    }

    <div class="totals">
      <div class="tot-row"><span>Subtotal</span><span>${escHtml(money(subtotal))}</span></div>
      <div class="tot-row"><span>Delivery</span><span>${escHtml(money(delivery))}</span></div>
      ${taxRowsHtml}
      <div class="tot-row total"><span>Total</span><span>${escHtml(money(p.totalCents))}</span></div>
    </div>

    <footer class="footer">
      <span>Powered by ${escHtml(SITE_NAME)}</span>
      <span>${escHtml(new Date().toLocaleString())}</span>
    </footer>
  </div>
  <script>window.onload=function(){window.print();};</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) {
    throw new Error('Pop-up blocked. Allow pop-ups for this site to print the receipt.');
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
