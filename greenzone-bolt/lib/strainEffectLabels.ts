/**
 * Leafly-style effect strings may live in the DB; the site shows alternate
 * wording so we are not mirroring third-party taxonomy verbatim in the UI.
 */

const EFFECT_SYNONYMS: Record<string, string> = {
  relaxed: 'Unwound',
  happy: 'Cheerful',
  euphoric: 'Elated',
  uplifted: 'Buoyant',
  creative: 'Imaginative',
  focused: 'Clear focus',
  'clear headed': 'Sharp-minded',
  energetic: 'Revitalized',
  energized: 'Revitalized',
  giggly: 'Playful',
  hungry: 'Appetite boost',
  sleepy: 'Drowsy',
  talkative: 'Conversational',
  tingly: 'Warm tingle',
  aroused: 'Sensual',
  calm: 'Settled',
  blissful: 'Rapturous',
  hazy: 'Dreamy',
  heady: 'Mind-forward',
  cerebral: 'Mind-centered',
  'body high': 'Full-body ease',
  couchlock: 'Deep rest',
  'couch lock': 'Deep rest',
  'pain relief': 'Comforting',
  'stress relief': 'Soothing',
  'depression relief': 'Mood lift',
  'anxiety relief': 'Settling',
  'insomnia relief': 'Rest-supporting',
  headache: 'Head ease',
  nausea: 'Settled stomach',
  inflammation: 'Easing',
  'muscle spasms': 'Loosened',
  fatigue: 'Pick-me-up',
};

function normalizeEffectKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCaseWords(s: string): string {
  const t = s.trim();
  if (!t) return '';
  return t
    .split(/\s+/)
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

export function formatStrainEffectForDisplay(raw: string): string {
  const key = normalizeEffectKey(raw);
  if (!key) return '';
  const mapped = EFFECT_SYNONYMS[key];
  if (mapped) return mapped;
  return titleCaseWords(raw);
}
