import { createHmac, timingSafeEqual } from 'crypto';

const CONTACT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function outreachUnsubscribeSecret(): string | null {
  const s = (process.env.OUTREACH_UNSUBSCRIBE_SECRET || '').trim();
  return s.length >= 16 ? s : null;
}

export function signOutreachContactId(contactId: string): string | null {
  const secret = outreachUnsubscribeSecret();
  if (!secret || !CONTACT_ID_RE.test(contactId)) return null;
  return createHmac('sha256', secret).update(contactId).digest('hex');
}

export function verifyOutreachContactSignature(contactId: string, sig: string): boolean {
  const secret = outreachUnsubscribeSecret();
  if (!secret || !CONTACT_ID_RE.test(contactId) || !/^[0-9a-f]{64}$/i.test(sig)) return false;
  const expected = createHmac('sha256', secret).update(contactId).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'));
  } catch {
    return false;
  }
}

export function buildOutreachUnsubscribeUrl(siteUrl: string, contactId: string): string {
  const sig = signOutreachContactId(contactId);
  if (!sig) {
    return `${siteUrl.replace(/\/$/, '')}/api/master/outreach/unsubscribe?c=${encodeURIComponent(contactId)}`;
  }
  const base = siteUrl.replace(/\/$/, '');
  return `${base}/api/master/outreach/unsubscribe?c=${encodeURIComponent(contactId)}&s=${encodeURIComponent(sig)}`;
}
