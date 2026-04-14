/**
 * Original directory copy for strain cards — not third-party marketing text.
 * Several variants rotate by slug so bulk imports are not word-identical.
 */

import { formatStrainEffectForDisplay } from '@/lib/strainEffectLabels';

export type StrainSummaryInput = {
  name: string;
  slug: string;
  type: string;
  thc_min?: number | null;
  thc_max?: number | null;
  effects?: string[] | null;
  flavors?: string[] | null;
  terpenes?: Record<string, unknown> | null;
};

function simpleHash(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function primaryTerpene(terpenes: Record<string, unknown> | null | undefined): string {
  if (!terpenes || typeof terpenes !== 'object') return '';
  const p = terpenes.primary;
  return typeof p === 'string' ? p.trim() : '';
}

/** Representative THC number for copy (single menu-style figure). */
function thcFigure(s: StrainSummaryInput): number | null {
  const a = s.thc_max ?? s.thc_min;
  const b = s.thc_min ?? s.thc_max;
  if (a != null && Number.isFinite(Number(a))) return Number(a);
  if (b != null && Number.isFinite(Number(b))) return Number(b);
  return null;
}

export function buildStrainDirectorySummary(s: StrainSummaryInput): string {
  const name = (s.name || 'This cultivar').trim();
  const slug = s.slug || name;
  const t = (s.type || 'hybrid').toLowerCase();
  const validType = t === 'indica' || t === 'sativa' || t === 'hybrid' ? t : 'hybrid';
  const thc = thcFigure(s);
  const terp = primaryTerpene(s.terpenes ?? null);
  const fx = (s.effects || []).map((e) => String(e).trim()).filter(Boolean);
  const top = fx[0] ? formatStrainEffectForDisplay(fx[0]) : '';
  const second = fx[1] ? formatStrainEffectForDisplay(fx[1]) : '';
  const flavorNote = (s.flavors || []).filter(Boolean).slice(0, 2);

  const v = simpleHash(slug) % 4;

  const thcSentence =
    thc != null
      ? [
          `Menus often land near ${thc}% THC, but batches vary—check the label or COA on your jar.`,
          `You will frequently see ~${thc}% THC on packaging; real potency still depends on the batch.`,
          `Listed THC is commonly around ${thc}%; treat it as a guide, not a guarantee.`,
          `Retail tags usually cite about ${thc}% THC—verify with the product you actually buy.`,
        ][v]
      : [
          'THC ranges move batch to batch; always read the package where you shop.',
          'Potency differs by grow and cure—use the printed label as the source of truth.',
          'Skip comparing numbers across shops without checking each product’s test results.',
          'There is no single THC number for a name on a menu—labels are batch-specific.',
        ][v];

  const typeSentence =
    [
      `${name} is usually filed as a ${validType} in strain indexes and menus.`,
      `Dispensaries tend to list ${name} under ${validType} lineage.`,
      `In catalogs, ${name} most often appears as a ${validType} entry.`,
      `${name} is broadly categorized as ${validType} for discovery—not a legal or medical label.`,
    ][v];

  let effectSentence = '';
  if (top && second) {
    effectSentence = [
      `In aggregated shopper tags, ${top} and ${second} show up most often (not medical claims).`,
      `Community check-ins frequently mention ${top} and ${second} before other notes.`,
      `Non-scientific reports often lead with ${top}, then ${second}, among other feelings.`,
      `Casual logs tend to emphasize ${top} and ${second}; your experience may differ.`,
    ][v];
  } else if (top) {
    effectSentence = [
      `Tagged experiences often highlight ${top} first; other notes vary widely.`,
      `Many casual reports center on ${top}; nothing here is a medical promise.`,
      `You will see ${top} come up a lot in crowd-sourced strain chatter.`,
      `${top} is the most repeated tag in informal lists for this name.`,
    ][v];
  }

  let terpSentence = '';
  if (terp) {
    terpSentence = [
      `${terp} is a terpene name that appears often next to this cultivar.`,
      `Terps shift by phenotype; ${terp} is a common headline note for this label.`,
      `Flavor chemistry varies, but ${terp} is frequently called out on menus.`,
      `If you are browsing by terpene, ${terp} is a recurring mention here.`,
    ][v];
  }

  let flavorExtra = '';
  if (flavorNote.length) {
    flavorExtra = ` Scent and taste notes sometimes echo ${flavorNote.join(' and ')}.`;
  }

  const close =
    'Effects are personal and product-specific. Use only where cannabis is legal.';

  return [typeSentence, thcSentence, effectSentence, terpSentence, flavorExtra.trim(), close]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
