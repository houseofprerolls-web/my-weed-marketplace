/** Put hero URL first in a newline-separated image list; drop duplicate of that URL elsewhere. */
export function parseImageLines(raw: string): string[] {
  return String(raw || '')
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function mergeHeroImageFirst(heroUrl: string | null | undefined, prevText: string): string {
  const hero = String(heroUrl || '').trim();
  if (!hero) return prevText;
  const rest = parseImageLines(prevText).filter((u) => u !== hero);
  return [hero, ...rest].join('\n');
}
