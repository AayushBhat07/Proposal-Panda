/**
 * Helpers for reading a bid draft's text.
 *
 * Blanks are the bracketed placeholders a bid draft leaves for the contractor: [___], [dd/mm/yyyy],
 * [Annexure __], [attach]. The bid is ready to submit when none are left.
 */

const BLANK = /\[[^[\]\n]{1,200}\]/g;

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
