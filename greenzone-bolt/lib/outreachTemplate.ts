/**
 * Built-in outreach copy uses merge tokens {{person_name}}, {{company_name}}, {{unsubscribe_url}},
 * {{phone}}, {{uls_premise_kind}}. Empty {{company_name}} is treated as "Valued Delivery Partner" when merged.
 */

export const OUTREACH_TEMPLATE_KEY_DEFAULT = 'onboarding_v2_delivery_partner';

export const OUTREACH_MERGE_TOKENS = [
  { token: '{{person_name}}', label: 'Contact name' },
  { token: '{{company_name}}', label: 'Company (fallback: Valued Delivery Partner)' },
  { token: '{{unsubscribe_url}}', label: 'Unsubscribe link (required for compliance)' },
  { token: '{{phone}}', label: 'Contact phone' },
  { token: '{{uls_premise_kind}}', label: 'ULS premise (storefront / delivery)' },
] as const;

export function defaultOutreachSubject(): string {
  return (
    process.env.OUTREACH_EMAIL_SUBJECT?.trim() ||
    'Onboarding delivery partners — DaTreehouse (Southern California)'
  );
}

/** HTML body with merge tokens — same source used for sends and “Load default” in the admin UI. */
export const DEFAULT_OUTREACH_HTML_TEMPLATE = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:system-ui,Segoe UI,sans-serif;line-height:1.5;color:#111;max-width:560px;">
  <p>Dear {{company_name}},</p>
  <p>I'm reaching out because we're currently onboarding delivery companies to <strong>DaTreehouse</strong>, our new cannabis directory and delivery platform serving Southern California.</p>
  <p>We designed DaTreehouse as a fairer alternative to traditional directories. Our goal is to reduce high upfront fees and give delivery companies a more sustainable way to connect directly with customers while building their business.</p>
  <p>Here's our straightforward onboarding offer:</p>
  <ul style="margin:0 0 1em 1.1em;padding:0;">
    <li>Start delivering immediately at no cost until you reach your first $5,000 in sales through the DaTreehouse platform.</li>
    <li>To become Smokers Club eligible and gain priority homepage visibility (making your service easily discoverable to loyalty program members), the monthly fee is $49.99. This subscription begins upon joining and provides enhanced exposure while you work toward the $5,000 milestone.</li>
  </ul>
  <p>This structure allows you to test the platform and generate revenue with minimal risk, while the Smokers Club membership ensures your service stands out to engaged customers who benefit from monthly giveaways and an ongoing loyalty store. Please reply to this email or contact me directly at <a href="tel:+19099928004">909-992-8004</a> or <a href="mailto:connect@datreehouse.com">connect@datreehouse.com</a> to schedule a quick call or receive the full onboarding packet, including setup instructions and commission details.</p>
  <p>We look forward to the possibility of working together to create a stronger, more sustainable ecosystem for cannabis delivery.</p>
  <p>Best regards,<br/>
  Duane Wade<br/>
  Lead Sales<br/>
  DaTreehouse<br/>
  909-992-8004<br/>
  <a href="mailto:connect@datreehouse.com">connect@datreehouse.com</a><br/>
  <a href="https://www.datreehouse.com">https://www.datreehouse.com</a></p>
  <p style="margin-top:24px;font-size:13px;color:#555;">
    <a href="{{unsubscribe_url}}" style="color:#166534;">Unsubscribe</a> from these messages.
  </p>
  <p style="font-size:12px;color:#888;margin-top:16px;">This message was sent to a business contact. Physical address available upon request.</p>
</body></html>`;

/** Plain-text body with merge tokens — keep in sync with HTML meaning. */
export const DEFAULT_OUTREACH_TEXT_TEMPLATE = `Dear {{company_name}},

I'm reaching out because we're currently onboarding delivery companies to DaTreehouse, our new cannabis directory and delivery platform serving Southern California.

We designed DaTreehouse as a fairer alternative to traditional directories. Our goal is to reduce high upfront fees and give delivery companies a more sustainable way to connect directly with customers while building their business.

Here's our straightforward onboarding offer:
• Start delivering immediately at no cost until you reach your first $5,000 in sales through the DaTreehouse platform.
• To become Smokers Club eligible and gain priority homepage visibility (making your service easily discoverable to loyalty program members), the monthly fee is $49.99. This subscription begins upon joining and provides enhanced exposure while you work toward the $5,000 milestone.

This structure allows you to test the platform and generate revenue with minimal risk, while the Smokers Club membership ensures your service stands out to engaged customers who benefit from monthly giveaways and an ongoing loyalty store. Please reply to this email or contact me directly at 909-992-8004 or connect@datreehouse.com to schedule a quick call or receive the full onboarding packet, including setup instructions and commission details.

We look forward to the possibility of working together to create a stronger, more sustainable ecosystem for cannabis delivery.

Best regards,
Duane Wade
Lead Sales
DaTreehouse
909-992-8004
connect@datreehouse.com
https://www.datreehouse.com

If you prefer not to receive these messages, unsubscribe here: {{unsubscribe_url}}

This message was sent to a business contact. Physical address available upon request.`;

export function getOutreachPlaceholderTemplateForEditor(): { subject: string; html: string; text: string } {
  return {
    subject: defaultOutreachSubject(),
    html: DEFAULT_OUTREACH_HTML_TEMPLATE,
    text: DEFAULT_OUTREACH_TEXT_TEMPLATE,
  };
}

export type OutreachMergeVars = {
  person_name: string;
  company_name: string;
  unsubscribe_url: string;
  phone: string;
  uls_premise_kind: string;
};

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

function companyDisplay(vars: OutreachMergeVars): string {
  return vars.company_name.trim() || 'Valued Delivery Partner';
}

function replacementMaps(vars: OutreachMergeVars): {
  subjectMap: Record<string, string>;
  htmlMap: Record<string, string>;
  textMap: Record<string, string>;
} {
  const company = companyDisplay(vars);
  const subjectMap: Record<string, string> = {
    '{{person_name}}': vars.person_name || '',
    '{{company_name}}': company,
    '{{unsubscribe_url}}': vars.unsubscribe_url,
    '{{phone}}': vars.phone || '',
    '{{uls_premise_kind}}': vars.uls_premise_kind || '',
  };
  const textMap = { ...subjectMap };
  const htmlMap: Record<string, string> = {
    '{{person_name}}': escapeHtml(vars.person_name || ''),
    '{{company_name}}': escapeHtml(company),
    '{{unsubscribe_url}}': escapeAttr(vars.unsubscribe_url),
    '{{phone}}': escapeHtml(vars.phone || ''),
    '{{uls_premise_kind}}': escapeHtml(vars.uls_premise_kind || ''),
  };
  return { subjectMap, htmlMap, textMap };
}

function applyReplacements(s: string, map: Record<string, string>): string {
  let out = s;
  for (const [k, v] of Object.entries(map)) {
    out = out.split(k).join(v);
  }
  return out;
}

export function renderOutreachOnboardingBody(vars: OutreachMergeVars): { html: string; text: string } {
  const { html, text } = applyTemplateOverrides(
    '',
    DEFAULT_OUTREACH_HTML_TEMPLATE,
    DEFAULT_OUTREACH_TEXT_TEMPLATE,
    vars
  );
  return { html, text };
}

export function applyTemplateOverrides(
  subject: string,
  html: string,
  text: string,
  vars: OutreachMergeVars
): { subject: string; html: string; text: string } {
  const { subjectMap, htmlMap, textMap } = replacementMaps(vars);
  return {
    subject: applyReplacements(subject, subjectMap),
    html: applyReplacements(html, htmlMap),
    text: applyReplacements(text, textMap),
  };
}
