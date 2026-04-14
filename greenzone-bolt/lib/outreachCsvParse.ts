import { normalizeOutreachCsvHeader } from '@/lib/outreachNormalize';

/** RFC4180-style: delimiter is `,` or `;` with optional `"` quotes. */
export function splitCsvLine(line: string, delimiter: string = ','): string[] {
  if (delimiter === '\t') {
    return line.split('\t').map((cell) => cell.trim().replace(/^"|"$/g, ''));
  }
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      q = !q;
    } else if (!q && c === delimiter) {
      out.push(cur.trim().replace(/^"|"$/g, ''));
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur.trim().replace(/^"|"$/g, ''));
  return out;
}

/**
 * EU Excel often exports `;`-separated CSV; some tools use TAB. If we only split on `,`,
 * the whole row becomes one "cell" and only inferEmailFromValues() finds data.
 */
export function detectCsvDelimiter(firstLine: string): string {
  const tabParts = firstLine.split('\t');
  if (tabParts.length >= 3) return '\t';
  const commaParts = splitCsvLine(firstLine, ',');
  if (commaParts.length >= 3) return ',';
  const semiParts = splitCsvLine(firstLine, ';');
  if (semiParts.length >= 3) return ';';
  return ',';
}

export function parseOutreachCsv(text: string): { headers: string[]; rows: string[][]; delimiter: string } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [], delimiter: ',' };
  const delimiter = detectCsvDelimiter(lines[0]!);
  const headers = splitCsvLine(lines[0]!, delimiter).map((h) => normalizeOutreachCsvHeader(h));
  const rows = lines.slice(1).map((ln) => splitCsvLine(ln, delimiter));
  return { headers, rows, delimiter };
}
