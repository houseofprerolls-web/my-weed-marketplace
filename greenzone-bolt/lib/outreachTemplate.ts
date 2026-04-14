/** Default onboarding cold email — merge vars {{person_name}}, {{company_name}}, {{unsubscribe_url}}, {{phone}}, {{uls_premise_kind}} */

export const OUTREACH_TEMPLATE_KEY_DEFAULT = 'onboarding_v1';

export function defaultOutreachSubject(): string {
  return process.env.OUTREACH_EMAIL_SUBJECT?.trim() || 'Invitation to list your dispensary on Da Treehouse';
}

export type OutreachMergeVars = {
  person_name: string;
  company_name: string;
  unsubscribe_url: string;
  phone: string;
  uls_premise_kind: string;
};

export function renderOutreachOnboardingBody(vars: OutreachMergeVars): { html: string; text: string } {
  const person = vars.person_name.trim() || 'there';
  const company = vars.company_name.trim() || 'your business';
  const unsub = vars.unsubscribe_url;

  const text = [
    `Hi ${person},`,
    '',
    `We're reaching out because ${company} may be a great fit for Da Treehouse — a marketplace where California shoppers discover licensed dispensaries.`,
    '',
    'If you would like to learn more or get set up, reply to this email and our team will help you with onboarding.',
    '',
    `If you prefer not to receive these messages, unsubscribe here: ${unsub}`,
    '',
    '— Da Treehouse',
    'This message was sent to a business contact. Physical address available upon request.',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:system-ui,Segoe UI,sans-serif;line-height:1.5;color:#111;max-width:560px;">
  <p>Hi ${escapeHtml(person)},</p>
  <p>We're reaching out because <strong>${escapeHtml(company)}</strong> may be a great fit for <strong>Da Treehouse</strong> — a marketplace where California shoppers discover licensed dispensaries.</p>
  <p>If you would like to learn more or get set up, <strong>reply to this email</strong> and our team will help you with onboarding.</p>
  <p style="margin-top:24px;font-size:13px;color:#555;">
    <a href="${escapeAttr(unsub)}" style="color:#166534;">Unsubscribe</a> from these messages.
  </p>
  <p style="font-size:12px;color:#888;margin-top:32px;">— Da Treehouse<br/>
  This message was sent to a business contact.</p>
</body></html>`;

  return { html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

export function applyTemplateOverrides(
  subject: string,
  html: string,
  text: string,
  vars: OutreachMergeVars
): { subject: string; html: string; text: string } {
  const map: Record<string, string> = {
    '{{person_name}}': vars.person_name,
    '{{company_name}}': vars.company_name,
    '{{unsubscribe_url}}': vars.unsubscribe_url,
    '{{phone}}': vars.phone,
    '{{uls_premise_kind}}': vars.uls_premise_kind,
  };
  let sub = subject;
  let h = html;
  let t = text;
  for (const [k, v] of Object.entries(map)) {
    sub = sub.split(k).join(v);
    h = h.split(k).join(v);
    t = t.split(k).join(v);
  }
  return { subject: sub, html: h, text: t };
}
