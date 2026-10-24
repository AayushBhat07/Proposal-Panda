/**
 * Helpers for reading a bid draft's text.
 *
 * Blanks are the bracketed placeholders a bid draft leaves for the contractor: [___], [dd/mm/yyyy],
 * [Annexure __], [attach]. The bid is ready to submit when none are left.
 */

// Two characters or more: [A], [N], [B] in the bid-capacity formula are symbols, not blanks.
const BLANK = /\[[^[\]\n]{2,200}\]/g;

export function countBlanks(text: string): number {
  return text.match(BLANK)?.length ?? 0;
}

/** Splits text into plain and blank parts, in order, so each blank can be highlighted. */
export function splitBlanks(text: string): Array<{ text: string; blank: boolean }> {
  const parts: Array<{ text: string; blank: boolean }> = [];
  let last = 0;
  for (const match of text.matchAll(BLANK)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), blank: false });
    parts.push({ text: match[0], blank: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), blank: false });
  return parts;
}

/**
 * The proformas are written with hard line breaks mid-sentence. Rejoins a line onto the one before it when
 * that line was wrapped (long, no closing punctuation) and this one doesn't start a list item.
 */
export function unwrapLines(text: string): string {
  const out: string[] = [];
  for (const line of text.split('\n')) {
    const prev = out[out.length - 1];
    const wrapped = prev !== undefined && prev.length >= 90 && !/[.:;!?]$/.test(prev.trimEnd());
    if (wrapped && line.trim() && !/^\s*([-•]|\d+\.)\s/.test(line)) out[out.length - 1] = `${prev.trimEnd()} ${line.trim()}`;
    else out.push(line);
  }
  return out.join('\n');
}

/**
 * Blanks worth filling in one go: the same placeholder in more than one section, such as
 * [name of authorised signatory] or [dd/mm/yyyy]. Placeholders repeated within a single section are table
 * columns ([client] per similar work, [attach] per document) and stay out, as do [Edit needed: ...] notes,
 * which ask for a section to be written rather than a value, and unnamed blanks like [___] or [₹ ___], which
 * mean something different in each place.
 */
export function sharedBlanks(contents: string[]): Array<{ blank: string; count: number }> {
  const sections = new Map<string, Set<number>>();
  const counts = new Map<string, number>();
  contents.forEach((text, i) => {
    for (const [blank] of text.matchAll(BLANK)) {
      if (/^\[Edit needed/i.test(blank) || !/[a-z]{2}/i.test(blank)) continue;
      counts.set(blank, (counts.get(blank) ?? 0) + 1);
      sections.set(blank, (sections.get(blank) ?? new Set()).add(i));
    }
  });
  return [...counts]
    .filter(([blank, count]) => sections.get(blank)!.size > 1 || count === 1)
    .map(([blank, count]) => ({ blank, count }));
}

export function fillBlank(text: string, blank: string, value: string): string {
  return text.split(blank).join(value);
}

/** Dates change with every bid, so their answers aren't kept for the next one. */
export const isRememberable = (blank: string) => !/date|dd\/mm|yyyy/i.test(blank);

// Notes for the contractor, not the department: the upload instruction, where each checklist document comes from,
// and the reminder to check eligibility claims.
const NOTE_LINE = /^Upload as one PDF in this order\b/i;
const NOTES = [/\s*\[attach\]/gi, /\s*\(specimen enclosed\)/gi, /\s*\(attached from vault: [^)\n]*\)/gi, /;\s*to be confirmed from company records/gi];
// Clause values from the tender analysis, appended for the contractor to check; the bid quotes the NIT instead.
const ANALYSIS_CLAUSES = /^Key contract clauses \(from the tender analysis; verify against the NIT\):/m;

/** The text as it goes to the department, without the notes the draft keeps for the contractor. */
export function forSubmission(text: string): string {
  const analysis = text.search(ANALYSIS_CLAUSES);
  return (analysis === -1 ? text : text.slice(0, analysis).trimEnd())
    .split('\n')
    .filter(line => !NOTE_LINE.test(line.trim()))
    .map(line => NOTES.reduce((out, note) => out.replace(note, ''), line))
    .join('\n')
    .replace(/^\n+/, '');
}
