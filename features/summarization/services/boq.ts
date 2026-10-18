/**
 * Reads the schedule of quantities (BOQ) printed inside a tender PDF: item number, description, quantity,
 * unit, the department's rate and amount, grouped under the sub-heads the tender prints. Deterministic, like
 * the other fact finders, so the figures can be checked against the tender's own totals.
 *
 * CPWD-style layouts this follows: an item number on its own line or leading the description, the description
 * wrapped over several lines, and the figures on the row's last line as "<qty> <unit> <rate> <amount>".
 */

export interface BoqItem {
  /** Item number as printed, e.g. "1.4.1.1" or "7 (a)" */
  no: string;
  description: string;
  quantity: number;
  unit: string;
  /** The department's estimated rate, in rupees */
  rate: number;
  amount: number;
  /** Sub-head or section the item falls under, e.g. "Earth Work" */
  section?: string;
}

export interface BoqPart {
  /** Heading of the schedule, e.g. "Civil work" */
  title: string;
  items: BoqItem[];
  /** The total the tender prints at the end of this schedule, if any */
  statedTotal?: number;
}

const START = /^\s*SCHEDU?L?E\s+OF\s+QUANTIT(?:Y|IES)\b|^\s*BILL\s+OF\s+QUANTIT(?:Y|IES)\b|^\s*PRICE\s+SCHEDULE\b/i;
const NUMBER = String.raw`\d{1,3}(?:,\d{2,3})*(?:\.\d+)?|\d+(?:\.\d+)?`;
/** The figures at the end of a BOQ row: quantity, unit (one or two words), rate, amount. */
/** "Cum", "Sq. m", or a "per …" unit like "per letter per cm height". */
const UNIT = String.raw`[A-Za-z][A-Za-z.]{0,11}(?:\s?[A-Za-z.]{1,6})?|[Pp]er(?:\s+[A-Za-z.]{1,8}){1,4}`;
const ROW = new RegExp(String.raw`^(.*?)\s*(${NUMBER})\s+(${UNIT})\s+(${NUMBER})\s+(${NUMBER})\s*$`);
const ITEM_NO = /^(\d{1,3}(?:\.\d{1,3}){0,4}|\(?[a-z]{1,2}\)|[ivx]{1,4}\))(?:\s+|$)(.*)$/;
const TOTAL = new RegExp(String.raw`^\s*(?:grand\s+|sub[\s-]?)?total\b[^\d]*(${NUMBER})\s*$`, 'i');
/** A total whose figure wraps onto a later line ("Grand Total" / "(I+II+…+XI)" / "9402546.40"). */
const TOTAL_LABEL = /^\s*(?:grand\s+|sub[\s-]?)?total\b[^\d]*$/i;
const TRAILING_FIGURE = new RegExp(String.raw`^[^\d]*(${NUMBER})\s*$`);
/** "Grand Total", "Total of ALL SUB HEAD": the schedule's own total, which later sub-head totals must not replace. */
const GRAND = /\bgrand\s+total\b|\btotal\s+of\s+all\b/i;
const SUB_HEAD = /^\s*SUB\s?-?HEAD\b\s*([IVXL]+)?\s*[:\-–]*\s*(.*)$/i;
/** Page furniture repeated on every page of a tender; never part of an item. */
const NOISE = /^\s*(?:correction\s*[–-]|page\s+\d+\s*$|item\s*$|no\.\s+description|description of item|\(in rs\.?\)|amount\s*$|qty\.?\s|rate\s*$)/i;
const NOT_UNITS = /^(?:and|or|of|to|the|in|at|per|with|for|rs\.?)$/i;

const toNumber = (s: string) => Number(s.replace(/,/g, ''));
const tidy = (s: string) => s.replace(/\s+/g, ' ').replace(/\s+([,.;:])/g, '$1').trim();

/** "1.4.1.1" → ["1", "1.4", "1.4.1"]: the items whose descriptions this one continues. */
function ancestors(no: string): string[] {
  const parts = no.split('.');
  return parts.slice(1).map((_, i) => parts.slice(0, i + 1).join('.'));
}

function parsePart(lines: string[], title: string): BoqPart {
  const items: BoqItem[] = [];
  const texts = new Map<string, string>();
  let section: string | undefined;
  let pendingNo: string | undefined;
  let lastTop: string | undefined;
  let buffer: string[] = [];
  let statedTotal: number | undefined;
  let grand = false;
  let subHead: string[] | null = null;
  let heading: { no: string; text: string; previous?: string } | undefined;
  /** An item number continues the current numbering (gaps of up to three allowed); "1.5 sq. mm cable" inside item 2 is text, not item 1.5. */
  const plausible = (no: string) => {
    const top = Number(no.split('.')[0]);
    const current = Number((pendingNo ?? lastTop ?? '').split('.')[0]);
    if (!pendingNo && !lastTop) return true;
    return top >= current && top <= current + 3;
  };

  const clean = lines.map(l => l.trim()).filter(l => l && !NOISE.test(l));
  for (let i = 0; i < clean.length; i++) {
    let line = clean[i];
    // Figures split over short lines ("754" / "Quintal" / "906.39 6,83,418", or "a) Khallasi 24" / "Per" / "Person" /
    // "Per" / "Month" / "29607.00 7,10,568.00"): join them back into one row.
    // The rate's last digits wrapped under it ("1 Each 1537488.1" / "2 1537488.12"): rejoin when qty × rate = amount.
    const cut = new RegExp(String.raw`^(.*?)(${NUMBER})\s+(${UNIT})\s+(\d[\d,]*\.\d+)$`).exec(line);
    const tail = cut && new RegExp(String.raw`^(\d{1,2})\s+(${NUMBER})$`).exec(clean[i + 1] ?? '');
    if (cut && tail && Math.abs(toNumber(cut[2]) * toNumber(cut[4] + tail[1]) - toNumber(tail[2])) <= 1) {
      line = `${cut[1]}${cut[2]} ${cut[3]} ${cut[4]}${tail[1]} ${tail[2]}`;
      i += 1;
    }
    const endsInQty = new RegExp(String.raw`\s(?:${NUMBER})$`).test(line);
    if (!ROW.test(line) && (line.length <= 24 || endsInQty)) {
      for (let take = 1; take <= 5 && i + take < clean.length; take++) {
        const joined = clean.slice(i, i + take + 1).join(' ');
        if (clean.slice(i + 1, i + take + 1).every(l => l.length <= 24) && ROW.test(joined) && (endsInQty || new RegExp(String.raw`^(?:${NUMBER})(?:\s|$)`).test(line))) {
          line = joined;
          i += take;
          break;
        }
      }
    }

    let total = TOTAL.exec(line);
    let label = line;
    if (!total && TOTAL_LABEL.test(line)) {
      for (let take = 1; take <= 3 && i + take < clean.length && !total; take++) {
        total = TRAILING_FIGURE.exec(clean[i + take]);
        if (total) i += take;
        else label += ` ${clean[i + take]}`;
      }
    }
    if (total) {
      if (!grand) statedTotal = toNumber(total[1]);
      grand ||= GRAND.test(label);
      continue;
    }

    const head = SUB_HEAD.exec(line);
    if (head) {
      subHead = [head[2]];
      section = tidy(head[2]) || `Sub head ${head[1] ?? ''}`.trim();
      buffer = [];
      pendingNo = undefined;
      lastTop = undefined;
      continue;
    }
    // A sub-head title can wrap onto the next line before the first item.
    if (subHead && !ITEM_NO.test(line) && !ROW.test(line) && subHead.length < 3) {
      subHead.push(line);
      section = tidy(subHead.join(' ').replace(/^[:\-–\s]+/, ''));
      continue;
    }
    subHead = null;

    const row = ROW.exec(line);
    if (row && !NOT_UNITS.test(row[3]) && toNumber(row[5]) > 0) {
      let lead = row[1].trim();
      let no = pendingNo;
      const numbered = ITEM_NO.exec(lead);
      if (numbered && /\d|\)/.test(numbered[1]) && (!/^\d/.test(numbered[1]) || plausible(numbered[1]))) {
        const label = numbered[1];
        no = /^\d/.test(label) ? label : `${pendingNo ?? lastTop ?? ''} ${label}`.trim();
        lead = numbered[2];
        // The lines before a numbered row describe its parent item, not the row itself.
        if (pendingNo && buffer.length) texts.set(pendingNo, tidy(buffer.join(' ')));
        buffer = [];
      }
      if (!no && heading) {
        no = heading.no;
        buffer = [heading.text, ...buffer];
        section = heading.previous;
      }
      if (!no) {
        buffer = [];
        continue;
      }
      const own = tidy([...buffer, lead].join(' '));
      const context = /^\d/.test(no) ? ancestors(no).map(a => texts.get(a)).filter(Boolean) : [texts.get(pendingNo ?? lastTop ?? '')].filter(Boolean);
      const description = tidy([...context, own].filter(Boolean).join(' — ')) || no;
      if (heading?.no === no) {
        pendingNo = no;
        heading = undefined;
      }
      items.push({
        no,
        description: description.length > 320 ? `${description.slice(0, 317).trimEnd()}…` : description,
        quantity: toNumber(row[2]),
        unit: row[3].replace(/\.$/, ''),
        rate: toNumber(row[4]),
        amount: toNumber(row[5]),
        section,
      });
      buffer = [];
      continue;
    }

    const numbered = ITEM_NO.exec(line);
    if (numbered && /^\d/.test(numbered[1]) && plausible(numbered[1]) && !/^(?:sq|mm|cm|m|kg|kv|kva|w|nos?|core|x)\b/i.test(numbered[2])) {
      const [, no, text] = numbered;
      // "1 Earth Work": a short heading for a group of items, not an item.
      if (!no.includes('.') && text && text.length <= 40 && /^[A-Z]/.test(text) && !/[,;&]|[.]$|\band$/.test(text) && text.split(' ').length <= 5) {
        // Usually a heading for items 1.1, 1.2…; if a row follows directly, it was an item after all.
        heading = { no, text: tidy(text), previous: section };
        section = tidy(text);
        texts.delete(no);
        pendingNo = undefined;
        lastTop = no;
        buffer = [];
        continue;
      }
      if (pendingNo && buffer.length) texts.set(pendingNo, tidy(buffer.join(' ')));
      heading = undefined;
      pendingNo = no;
      if (!no.includes('.')) lastTop = no;
      buffer = text ? [text] : [];
      continue;
    }
    // "(a) Group C" with its figures on the next line: a lettered sub-item of the pending item.
    if (numbered && pendingNo) {
      if (buffer.length) texts.set(pendingNo, tidy(buffer.join(' ')));
      buffer = [line];
      continue;
    }

    buffer.push(line);
    if (pendingNo) texts.set(pendingNo, tidy(buffer.join(' ')));
  }
  return { title, items, statedTotal };
}

/** Every schedule of quantities in the tender text; empty when the BOQ is a separate file. */
export function findBoq(text: string): BoqPart[] {
  const lines = text.split('\n');
  const starts = lines.flatMap((line, i) => (START.test(line) ? [i] : []));
  const parts: BoqPart[] = [];
  // A cover page ("Schedule of Quantity for Civil Work") often comes just before the table's own heading.
  let carried = '';
  starts.forEach((start, k) => {
    const end = starts[k + 1] ?? lines.length;
    const heading = tidy(lines.slice(start, start + 3).join(' '))
      .replace(/^.*?QUANTIT(?:Y|IES)\s*/i, '')
      .replace(/^(?:for|applicable to)\s+/i, '')
      .replace(/[()]/g, '')
      .slice(0, 80);
    const part = parsePart(lines.slice(start + 1, end), heading);
    if (part.items.length >= 3) {
      parts.push({ ...part, title: titleFor(`${carried} ${heading}`, parts.length) });
      carried = '';
    } else {
      carried = end - start < 12 ? heading : '';
    }
  });
  return parts;
}

function titleFor(heading: string, index: number): string {
  if (/e\s*&\s*m|electric/i.test(heading)) return 'Electrical and mechanical work';
  if (/civil/i.test(heading)) return 'Civil work';
  const clean = heading.replace(/\s*name of work.*$/i, '').trim();
  return /^[A-Z]/.test(clean) && clean.length <= 40 && !/[:;]/.test(clean) ? clean : index ? `Schedule ${index + 1}` : 'Schedule of quantities';
}

export interface BoqInsights {
  itemCount: number;
  /** Sum of the amounts read */
  total: number;
  /** Sum of the totals the tender prints, when every schedule prints one */
  statedTotal?: number;
  /** Items that together make up 80% of the value, largest first */
  majorItems: BoqItem[];
  bySection: Array<{ section: string; amount: number; items: number }>;
  /** Rows where quantity × rate is more than 1% away from the amount printed */
  arithmetic: BoqItem[];
  lumpSum: BoqItem[];
}

export function boqInsights(parts: BoqPart[]): BoqInsights {
  const items = parts.flatMap(p => p.items);
  const total = items.reduce((sum, i) => sum + i.amount, 0);
  const sorted = [...items].sort((a, b) => b.amount - a.amount);
  const majorItems: BoqItem[] = [];
  let running = 0;
  for (const item of sorted) {
    if (running >= total * 0.8) break;
    majorItems.push(item);
    running += item.amount;
  }
  const sections = new Map<string, { amount: number; items: number }>();
  for (const part of parts) {
    for (const item of part.items) {
      const key = parts.length > 1 ? `${part.title}: ${item.section ?? 'Other items'}` : (item.section ?? 'Other items');
      const entry = sections.get(key) ?? { amount: 0, items: 0 };
      sections.set(key, { amount: entry.amount + item.amount, items: entry.items + 1 });
    }
  }
  return {
    itemCount: items.length,
    total,
    statedTotal: parts.every(p => p.statedTotal) ? parts.reduce((sum, p) => sum + p.statedTotal!, 0) : undefined,
    majorItems,
    bySection: [...sections].map(([section, v]) => ({ section, ...v })).sort((a, b) => b.amount - a.amount),
    arithmetic: items.filter(i => Math.abs(i.quantity * i.rate - i.amount) > Math.max(2, i.amount * 0.01)),
    lumpSum: items.filter(i => /^(?:l\.?s\.?|lump|job)/i.test(i.unit)),
  };
}

/** "Rs. 15,64,86,955/-" → 156486955 */
export function rupees(printed: string | undefined): number | undefined {
  const match = printed?.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}
