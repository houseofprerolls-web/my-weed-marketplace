/**
 * Server-only transactional send.
 *
 * Uses the same **Resend API key** as typical Vercel setups (`RESEND_API_KEY`, or `OUTREACH_RESEND_API_KEY`).
 * Transport: set `OUTREACH_EMAIL_TRANSPORT=smtp` to force mailbox SMTP; `resend` to force Resend; otherwise **auto**
 * prefers **Resend HTTP** when a Resend key exists (aligned with Supabase Auth when Auth uses Resend), else SMTP.
 *
 * From: `OUTREACH_EMAIL_FROM` / `OUTREACH_EMAIL_FROM_OPTIONS`, or when only `RESEND_API_KEY` is set see
 * `implicitOutreachFromWhenResendConfigured` in `outreachFromOptions.ts` (same default mailbox as forgot-password in .env.example).
 *
 * Supabase Auth mail itself is still configured in the Supabase Dashboard (Authentication → SMTP).
 */

import nodemailer from 'nodemailer';
import {
  normalizeOutreachFromIdentity,
  parseOutreachFromOptions,
  outreachOrAppResendApiKey,
} from '@/lib/outreachFromOptions';

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

function outreachEmailTransportPref(): 'resend' | 'smtp' {
  const t = (process.env.OUTREACH_EMAIL_TRANSPORT || '').trim().toLowerCase();
  if (t === 'smtp') return 'smtp';
  if (t === 'resend') return 'resend';
  if (outreachOrAppResendApiKey()) return 'resend';
  return 'smtp';
}

export function outreachEmailConfigured(): boolean {
  if (parseOutreachFromOptions().length === 0) return false;
  return smtpConfigured() || Boolean(outreachOrAppResendApiKey());
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
  const apiKey = outreachOrAppResendApiKey();
  const resolvedFrom = normalizeOutreachFromIdentity(
    params.from?.trim() ||
      parseOutreachFromOptions()[0]?.from ||
      (process.env.OUTREACH_EMAIL_FROM || '').trim()
  );
  if (!apiKey || !resolvedFrom) {
    return {
      providerMessageId: null,
      error:
        'Missing RESEND_API_KEY (or OUTREACH_RESEND_API_KEY) or a configured from address (OUTREACH_EMAIL_FROM / OUTREACH_EMAIL_FROM_OPTIONS / implicit connect@ when Resend key is set)',
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
  const pref = outreachEmailTransportPref();
  if (pref === 'resend') {
    if (outreachOrAppResendApiKey()) return sendOutreachEmailResend(params);
    if (smtpConfigured()) return sendOutreachEmailSmtp(params);
    return sendOutreachEmailResend(params);
  }
  if (smtpConfigured()) return sendOutreachEmailSmtp(params);
  if (outreachOrAppResendApiKey()) return sendOutreachEmailResend(params);
  return sendOutreachEmailResend(params);
}
