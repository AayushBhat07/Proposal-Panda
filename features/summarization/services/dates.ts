/**
 * The tender's key dates as the NIT prints them: last date for submitting the bid, bid opening, pre-bid
 * meeting and the last date for queries. Read from the labelled rows of the NIT's schedule, never guessed:
 * a date counts only when it follows its label closely, before the next label starts.
 */

export type KeyDateKind = 'submission' | 'opening' | 'preBid' | 'queries';

export interface KeyDate {
  kind: KeyDateKind;
  /** yyyy-mm-dd */
  date: string;
  /** HH:MM, 24-hour, when the tender gives a time */
  time?: string;
  /** The tender's own words, for checking */
  printed: string;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const LABELS: Array<{ kind: KeyDateKind; label: RegExp }> = [
  {
    kind: 'submission',
    label:
      /\b(?:last|closing|end)\s+(?:time\s*(?:&|and)\s*)?(?:date|time)(?:\s*(?:&|and)\s*(?:time|date))?\s+(?:of|for)\s+(?:online\s+)?(?:submission|receipt|bid\s+submission|e-?tender)|\bbid\s+(?:submission\s+)?(?:end|last)\s+date|\blast\s+date\s*(?:&|and)\s*time\s+of\s+uploading|\bsubmission\s+end\b|\bdate\s*(?:&|and)\s*time\s+of\s+submission|\bclosing\s+date\b|\bdue\s+date\s+(?:of|for)\s+submission/i,
  },
  {
    kind: 'opening',
    label:
      /\b(?:date|time)(?:\s*(?:&|and)\s*(?:time|date))?\s+(?:of\s+)?(?:the\s+)?opening\b|\b(?:technical\s+)?(?:bid|tender)\s+opening(?:\s+date)?\b|\bopening\s+of\s+(?:the\s+)?(?:online\s+)?(?:technical\s+)?(?:bids?|tenders?|packet\s*a)\b/i,
  },
  { kind: 'preBid', label: /\bpre[\s-]*bi\s?d\s+(?:mee\s?ting|conference)/i },
  { kind: 'queries', label: /\b(?:bid\s+clarification|last\s+date\s+(?:for|of)\s+(?:seeking\s+clarification|(?:receipt\s+of\s+)?(?:pre[\s-]?bid\s+)?queries))/i },
];

/** Any label, so a window stops where the next row begins. */
const ANY_LABEL = new RegExp(LABELS.map(l => l.label.source).join('|'), 'i');

const DATE = new RegExp(
  [
    String.raw`\b(\d{1,2})[./-](\d{1,2})[./-]((?:19|20)?\d{2})\b`,
    String.raw`\b(\d{1,2})(?:st|nd|rd|th)?[\s-]+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?[\s,-]+((?:19|20)\d{2})\b`,
  ].join('|'),
  'gi'
);
const TIME = /\b(\d{1,2})[:.](\d{2})(?::\d{2})?\.?\s*(a\.?\s?m\.?|p\.?\s?m\.?|hrs?\.?|hours?|noon)?|\b(\d{1,2})\s*(a\.?m\.?|p\.?m\.?)|\b(noon)\b/i;

function toIso(day: number, month: number, year: number): string | undefined {
  const y = year < 100 ? 2000 + year : year;
  if (month < 1 || month > 12 || day < 1 || day > 31 || y < 2000 || y > 2100) return undefined;
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function readTime(text: string): string | undefined {
  const m = TIME.exec(text);
  if (!m) return undefined;
  if (m[6]) return '12:00';
  let hour = Number(m[1] ?? m[4]);
  // "00 A.M" is the tail of an OCR-split "11 .00 A.M", not midnight.
  if (m[4] && (hour < 1 || hour > 12)) return undefined;
  const minute = Number(m[2] ?? 0);
  const meridiem = (m[3] ?? m[5] ?? '').toLowerCase().replace(/[\s.]/g, '');
  // A bare "3.30" with no AM/PM or hrs could be a clause number; only trust times with a unit or a colon.
  if (!meridiem && !/:/.test(m[0])) return undefined;
  if (meridiem === 'noon') return '12:00';
  if (meridiem.startsWith('p') && hour < 12) hour += 12;
  if (meridiem.startsWith('a') && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return undefined;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

const AS_PER_PORTAL = /\bas\s+per\s+(?:the\s+)?(?:CPPP?|e-?procurement|e-?tender(?:ing)?|online)?\s*(?:portal|website)/i;

/** Every date row says "As per CPP portal": the dates live on the portal, not in the document. */
export const datesOnPortal = (text: string) =>
  /\b(?:date|time)\b[^:\n]{0,60}:?\s*as\s+per\s+(?:the\s+)?CPPP?\s*portal/i.test(text.slice(0, 120_000));

/** How far after a label its date may sit: NIT tables wrap the label over several short lines. */
const WINDOW = 240;

export function findKeyDates(text: string): KeyDate[] {
  // NIT schedules sit near the front; later mentions are conditions ("valid on the last date of submission").
  // Scans split times as "11 .00 A.M"; join them back.
  const flat = text.slice(0, 120_000).replace(/\s+/g, ' ').replace(/(\d)\s+([.:])(?=\d{2}\b)/g, '$1$2');
  const found = new Map<KeyDateKind, KeyDate>();
  for (const { kind, label } of LABELS) {
    const global = new RegExp(label.source, 'gi');
    for (const match of flat.matchAll(global)) {
      const start = match.index! + match[0].length;
      let window = flat.slice(start, start + WINDOW);
      const next = window.search(ANY_LABEL);
      if (next > 0) window = window.slice(0, next);
      const dates = [...window.matchAll(DATE)];
      if (!dates.length) continue;
      // A table row that reaches the date only through other figures ("7,04,913/- 2months 30.6.16") is some other column.
      if (/\/-|\bRs\.?\s*\d/.test(window.slice(0, dates[0].index))) continue;
      // "pre-bid meeting : As per CPP portal 14 Venue … 16 Tentative date of presentation : 3rd June": not this row's date.
      if (AS_PER_PORTAL.test(window.slice(0, dates[0].index))) continue;
      // "From 20-12-2024 at 10:00 hrs to 03-01-2025 at 14:30": the deadline is the end of the range.
      const between = dates.length > 1 ? window.slice(dates[0].index! + dates[0][0].length, dates[1].index) : '';
      const ranged = (kind === 'submission' || kind === 'queries') && between.length < 40 && /\bto\b|\btill\b|से/i.test(between);
      const d = ranged ? dates[1] : dates[0];
      const iso = d[1] ? toIso(Number(d[1]), Number(d[2]), Number(d[3])) : toIso(Number(d[4]), MONTHS.indexOf(d[5].toLowerCase()) + 1, Number(d[6]));
      if (!iso) continue;
      // The time is printed just before ("03:00 PM on 01.09.2026") or just after ("at 15:00 hrs").
      const at = d.index!;
      const before = window.slice(Math.max(0, at - 22), at);
      const after = window.slice(at + d[0].length, at + d[0].length + 40).split(/\bfrom\b|\bto\s+\d{1,2}[./-]\d{1,2}[./-]\d{2}/i)[0];
      const time = readTime(after) ?? readTime(before);
      const printed = `${match[0]} ${window.slice(0, at + d[0].length + 30)}`.replace(/\s+/g, ' ').trim().slice(0, 200);
      found.set(kind, { kind, date: iso, time, printed });
      break;
    }
  }
  return LABELS.flatMap(({ kind }) => (found.has(kind) ? [found.get(kind)!] : []));
}

export const KEY_DATE_LABELS: Record<KeyDateKind, string> = {
  submission: 'Bid due',
  opening: 'Bid opening',
  preBid: 'Pre-bid meeting',
  queries: 'Last date for queries',
};

/** Whole days from `today` to the date, negative once it has passed. */
export function daysUntil(date: string, today = new Date()): number {
  const [y, m, d] = date.split('-').map(Number);
  const target = Date.UTC(y, m - 1, d);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - now) / 86_400_000);
}

export function formatKeyDate(k: Pick<KeyDate, 'date' | 'time'>): string {
  const [y, m, d] = k.date.split('-').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return k.time ? `${day}, ${k.time}` : day;
}

export function countdown(date: string, today = new Date()): string {
  const days = daysUntil(date, today);
  if (days < 0) return `${-days} ${days === -1 ? 'day' : 'days'} ago`;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}
