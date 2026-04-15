import {
  defaultOutreachSubject,
  renderOutreachOnboardingBody,
  applyTemplateOverrides,
  type OutreachMergeVars,
} from '@/lib/outreachTemplate';
import { buildOutreachUnsubscribeUrl } from '@/lib/outreachUnsubscribe';
import { htmlToPlainText, plainTextToSimpleHtml } from '@/lib/outreachHtmlText';

export type OutreachComposeRow = {
  id: string;
  email: string;
  person_name: string | null;
  company_name: string | null;
  phone?: string | null;
  uls_premise_kind?: string | null;
};

export function outreachMergeVarsForRow(row: OutreachComposeRow, siteUrl: string): OutreachMergeVars {
  const unsubUrl = buildOutreachUnsubscribeUrl(siteUrl, row.id);
  return {
    person_name: row.person_name || '',
    company_name: row.company_name || '',
    unsubscribe_url: unsubUrl,
    phone: row.phone || '',
    uls_premise_kind: row.uls_premise_kind || '',
  };
}

export type OutreachComposeDraft = {
  subject?: string | null;
  html?: string | null;
  text?: string | null;
};

function resolveCustomBodies(draft: OutreachComposeDraft | null | undefined): {
  html: string;
  text: string;
} | null {
  const envHtml = (process.env.OUTREACH_EMAIL_HTML || '').trim();
  const envText = (process.env.OUTREACH_EMAIL_TEXT || '').trim();
  const customHtml = (draft?.html ?? '').trim() || envHtml;
  const customText = (draft?.text ?? '').trim() || envText;

  if (customHtml && customText) {
    return { html: customHtml, text: customText };
  }
  if (customHtml && !customText) {
    return { html: customHtml, text: htmlToPlainText(customHtml) };
  }
  if (!customHtml && customText) {
    return { html: plainTextToSimpleHtml(customText), text: customText };
  }
  return null;
}

/** Same output shape as send route: subject + bodies after merge. */
export function composeOutreachMessage(
  row: OutreachComposeRow,
  siteUrl: string,
  draft?: OutreachComposeDraft | null
): { subject: string; html: string; text: string } {
  const subjectBase = (draft?.subject ?? '').trim() || defaultOutreachSubject();
  const vars = outreachMergeVarsForRow(row, siteUrl);
  const bodies = resolveCustomBodies(draft);
  if (bodies) {
    return applyTemplateOverrides(subjectBase, bodies.html, bodies.text, vars);
  }
  const rendered = renderOutreachOnboardingBody(vars);
  return { subject: subjectBase, html: rendered.html, text: rendered.text };
}
