/**
 * Server-only transactional send.
 *
 * 1) **Mailbox SMTP** (e.g. Microsoft 365 / Outlook, or any host) when set: `OUTREACH_SMTP_HOST`, `OUTREACH_SMTP_USER`,
 *    `OUTREACH_SMTP_PASS`, plus `OUTREACH_EMAIL_FROM` or `OUTREACH_EMAIL_FROM_OPTIONS`.
 * 2) **Resend** (fallback): `OUTREACH_RESEND_API_KEY` or `RESEND_API_KEY` + from options.
 *
 * Supabase Auth mail is configured in the Supabase Dashboard (Authentication → SMTP), not here.
 */

import nodemailer from 'nodemailer';
import { normalizeOutreachFromIdentity, parseOutreachFromOptions } from '@/lib/outreachFromOptions';

export type SendOutreachEmailParams = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Must be an allowlisted identity (resolved server-side before calling). */
  from?: string;
  /** Shown as SMTP headers on the outbound message (reply chain / List-Unsubscribe). */
  headers?: Record<string, string>;
  replyTo?: string;
};

export type SendOutreachEmailResult = {
  providerMessageId: string | null;
  error?: string;
};

function smtpHost(): string {
  return (process.env.OUTREACH_SMTP_HOST || process.env.SMTP_HOST || '').trim();
}

function smtpUser(): string {
  return (process.env.OUTREACH_SMTP_USER || process.env.SMTP_USER || '').trim();
}

function smtpPass(): string {
  return (
    process.env.OUTREACH_SMTP_PASS ||
    process.env.SMTP_PASSWORD ||
    process.env.SMTP_PASS ||
    ''
  ).trim();
}

function smtpConfigured(): boolean {
  return Boolean(smtpHost() && smtpUser() && smtpPass());
}

export function outreachEmailConfigured(): boolean {
  const fromOk = parseOutreachFromOptions().length > 0;
  if (!fromOk) return false;
  if (smtpConfigured()) return true;
  const key = (process.env.OUTREACH_RESEND_API_KEY || process.env.RESEND_API_KEY || '').trim();
  return Boolean(key);
}

function smtpPort(): number {
  const p = parseInt((process.env.OUTREACH_SMTP_PORT || process.env.SMTP_PORT || '587').trim(), 10);
  return Number.isFinite(p) && p > 0 ? p : 587;
}

/** true = implicit TLS (port 465); false = STARTTLS on 587 */
function smtpSecure(): boolean {
  const raw = (process.env.OUTREACH_SMTP_SECURE || '').trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'yes') return true;
  if (raw === '0' || raw === 'false' || raw === 'no') return false;
  return smtpPort() === 465;
}

async function sendOutreachEmailSmtp(params: SendOutreachEmailParams): Promise<SendOutreachEmailResult> {
  const resolvedFrom = normalizeOutreachFromIdentity(
    params.from?.trim() ||
      parseOutreachFromOptions()[0]?.from ||
      (process.env.OUTREACH_EMAIL_FROM || '').trim()
  );
  if (!resolvedFrom) {
    return {
      providerMessageId: null,
      error: 'Missing from address (OUTREACH_EMAIL_FROM / OUTREACH_EMAIL_FROM_OPTIONS)',
    };
  }

  const replyTo = params.replyTo?.trim() || process.env.OUTREACH_REPLY_TO?.trim();

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost(),
      port: smtpPort(),
      secure: smtpSecure(),
      auth: {
        user: smtpUser(),
        pass: smtpPass(),
      },
    });

    const info = await transporter.sendMail({
      from: resolvedFrom,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: replyTo || undefined,
      headers: params.headers && Object.keys(params.headers).length > 0 ? params.headers : undefined,
    });

    return { providerMessageId: info.messageId ?? null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { providerMessageId: null, error: msg };
  }
}

async function sendOutreachEmailResend(params: SendOutreachEmailParams): Promise<SendOutreachEmailResult> {
  const apiKey = (process.env.OUTREACH_RESEND_API_KEY || process.env.RESEND_API_KEY || '').trim();
  const resolvedFrom = normalizeOutreachFromIdentity(
    params.from?.trim() ||
      parseOutreachFromOptions()[0]?.from ||
      (process.env.OUTREACH_EMAIL_FROM || '').trim()
  );
  if (!apiKey || !resolvedFrom) {
    return {
      providerMessageId: null,
      error:
        'Missing OUTREACH_RESEND_API_KEY (or RESEND_API_KEY) or a configured from address (OUTREACH_EMAIL_FROM / OUTREACH_EMAIL_FROM_OPTIONS)',
    };
  }

  const replyTo = params.replyTo?.trim() || process.env.OUTREACH_REPLY_TO?.trim();

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: resolvedFrom,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      reply_to: replyTo || undefined,
      headers: params.headers && Object.keys(params.headers).length > 0 ? params.headers : undefined,
    }),
  });

  const j = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
  if (!res.ok) {
    const msg = j.message || j.name || res.statusText || 'Send failed';
    return { providerMessageId: null, error: msg };
  }
  return { providerMessageId: j.id ?? null };
}

export async function sendOutreachEmail(params: SendOutreachEmailParams): Promise<SendOutreachEmailResult> {
  if (smtpConfigured()) {
    return sendOutreachEmailSmtp(params);
  }
  return sendOutreachEmailResend(params);
}
