/** Helpers when only HTML or only plain text is provided for outreach drafts. */

export function htmlToPlainText(html: string): string {
  let t = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  t = t
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n');
  t = t.replace(/<[^>]+>/g, '');
  return t
    .replace(/&nbsp;/g, ' ')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function plainTextToSimpleHtml(text: string): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  const blocks = esc(text).split(/\n\n+/);
  const inner = blocks
    .map((b) => `<p style="margin:0 0 1em 0;">${b.split('\n').join('<br/>\n')}</p>`)
    .join('\n');
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:system-ui,Segoe UI,sans-serif;line-height:1.5;color:#111;max-width:560px;">
${inner}
</body></html>`;
}
