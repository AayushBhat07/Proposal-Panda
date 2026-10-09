/**
 * PHASE 4A: Tender summarization service
 * Each summary section is produced by the local analysis model through Ollama
 * (AI_CONFIG.ANALYSIS_MODEL). If Ollama is unreachable, a keyword-based extractive
 * fallback runs instead and metadata.modelUsed says so.
 */

import { AI_CONFIG } from '@/lib/config/constants';
import { checkLlmHealth, generateWithLlmSafe } from '@/lib/llm/ollama';
import type {
  TenderDocumentInput,
  TenderSummary,
  SummarizationOptions,
  SummarizationResult,
  TextChunk,
} from '../types/summarization.types';

/** How much raw tender text the report keeps for bid drafting (~2.5k tokens; Llama 3 has an 8k context). */
const SOURCE_TEXT_CHARS = 10000;

/*
 * Deterministic tender facts. Real tenders print these as "Label : value" rows, in two-column tables where the value
 * sits on the next line, or as sentences that wrap across PDF lines, so each finder looks at the label's line and
 * the line or two after it. A finder returns undefined rather than guess: the bid then shows a placeholder.
 */

/** Value of the first label match, searched in the rest of that line and then the next `lookahead` lines. */
function labelledValue(
  text: string,
  label: RegExp,
  value: (s: string) => string | undefined,
  { lookahead = 2, skip }: { lookahead?: number; skip?: (before: string, line: string) => boolean } = {}
): string | undefined {
  const lines = text.split('\n');
  const global = new RegExp(label.source, label.flags.includes('g') ? label.flags : `${label.flags}g`);
  for (let i = 0; i < lines.length; i++) {
    for (const match of lines[i].matchAll(global)) {
      const before = lines[i].slice(0, match.index);
      if (skip?.(before, lines[i])) continue;
      const rest = lines[i].slice(match.index! + match[0].length);
      // Only a label that ends its line ("Earnest Money Deposit (EMD)" in a two-column table) has its value below.
      const endsLine = (rest.match(/\p{L}/gu) ?? []).length <= 12;
      const found =
        value(rest) ??
        (endsLine
          ? lines.slice(i + 1, i + 1 + lookahead).reduce<string | undefined>((hit, next) => hit ?? value(next), undefined)
          : undefined);
      if (found) return found;
    }
  }
  return undefined;
}

const NIT_LABELS: RegExp[] = [
  /\b(?:N\.?\s?I\.?\s?T\.?|NIeT|Notice Inviting (?:e-?)?Tenders?)\)?\s*(?:No|Number|Ref(?:erence)?)\b\.?/i,
  /\b(?:e-?\s?)?Tender Notice\s*(?:No|Number)\b\.?/i,
  /\b(?:e-?\s?)?Tender\s*(?:ID|No|Number|Ref(?:erence)?|Document No)\b\.?/i,
  /\b(?:Bid|RFP|Enquiry)\s*(?:No|Number|Ref(?:erence)?)\b\.?/i,
  /^\s*(?:Ref\.?\s*)?No\.(?=\s*[A-Z0-9]+\/)/i,
];

function nitValue(rest: string): string | undefined {
  // Labels like "Bid Number/बोली क्रमांक :" carry a translation before the colon.
  const value = rest
    .replace(/^[^:\-–A-Z0-9]*?[:\-–]\s*/i, '')
    .replace(/^\s*[:\-–.]\s*/, '')
    .split(/\s*(?:,|\s)\s*(?:dated|dt\.?|date)\b|\s{3,}|\s+F\.\s?No\b|\s+(?:for|regarding|under|is|has|are|was)\s|\s+\(/i)[0]
    .trim()
    .replace(/[.,;:)\s]+$/, '');
  if (!/\d/.test(value) || value.length < 3 || value.length > 80) return undefined;
  if (/^\d{1,4}$/.test(value) || /^(?:of|for|and|the|in)\b/i.test(value)) return undefined;
  if (!/[\/\-_]|[A-Z].*\d|\d.*[A-Z]/i.test(value)) return undefined;
  return value;
}

/** Finds the NIT / tender reference, e.g. "NIT No. 14/EE/PCD-II/2026-27" or "Bid Number: GEM/2024/B/4869384". */
export function findNitReference(text: string): string | undefined {
  for (const label of NIT_LABELS) {
    const found = labelledValue(text, label, nitValue, { lookahead: 1 });
    if (found) return found;
  }
  return undefined;
}

const PERIOD_LABEL =
  /(?:period of completion|completion period|time allowed(?: for (?:carrying out|completion)[a-z ]*)?|time of completion|duration of (?:the )?(?:contract|work)|contract (?:period|duration)|period of (?:the )?contract|stipulated (?:period|time)(?: of completion)?|to be completed (?:with)?in)/i;
const PERIOD_VALUE =
  /^[^0-9\n]{0,40}?\(?\s*(\d{1,3})\s*\)?\s*(?:\([A-Za-z -]+\)\s*)?(calendar\s+)?(months?|days|years?)\b/i;

/** Finds the completion period in months, e.g. "Period of completion: 18 (Eighteen) months" or "90 (Ninety) Days". */
export function findCompletionMonths(text: string): number | undefined {
  const found = labelledValue(
    text,
    PERIOD_LABEL,
    rest => {
      const m = rest.match(PERIOD_VALUE);
      if (!m) return undefined;
      const n = Number(m[1]);
      const unit = m[3].toLowerCase();
      const months = unit.startsWith('day') ? Math.ceil(n / 30) : unit.startsWith('year') ? n * 12 : n;
      return months >= 1 && months <= 120 ? String(months) : undefined;
    },
    { lookahead: 1 }
  );
  return found ? Number(found) : undefined;
}

const AMOUNT =
  /(?:Rs\.?|₹|INR|रु\.?|\(in INR\))\s*[:\-]?\s*(\d+(?:,\s?\d+)*(?:\.\d+)?)\s*(?:\/-)?\s*(lakhs?|lacs?|crores?|cr\b)?/i;

/** "Rs. 38, 32,203/-" -> { printed: "Rs. 38,32,203", rupees: 3832203 } */
function parseAmount(s: string): { printed: string; rupees: number } | undefined {
  const m = s.match(AMOUNT);
  if (!m) return undefined;
  // "EMD will be Rs. 50 lakh for tenders valuing above Rs. 50 Cr." is a rule, not this tender's figure.
  if (/^\s*(?:for|if|where|in case|above|up\s?to|upto|exceeding|and\s*(?:above|$)|or more)\b/i.test(s.slice(m.index! + m[0].length))) {
    return undefined;
  }
  const digits = m[1].replace(/\s/g, '');
  const unit = m[2]?.toLowerCase();
  const base = Number(digits.replace(/,/g, ''));
  const rupees = unit?.startsWith('cr') ? base * 1e7 : unit ? base * 1e5 : base;
  const printed = `Rs. ${digits}${unit ? ` ${unit.startsWith('cr') ? 'crore' : 'lakh'}` : ''}`;
  return { printed, rupees };
}

/**
 * "40% of the estimated cost (i.e. ₹ 7.86 lakhs)" and "works having estimated value of Rs. 10 lakhs" are thresholds,
 * not this tender's figure.
 */
const isFraction = (before: string) =>
  /\d\s*%\s*(?:of\s*)?(?:the\s*)?$|\b(?:having|valuing|exceeding|above|below|more than|less than|up\s?to)\s*(?:an?\s*|the\s*)?$/i.test(before);

function findAmount(text: string, label: RegExp, minRupees: number): string | undefined {
  return labelledValue(
    text,
    label,
    rest => {
      // A data row prints the amount right after the label; prose ("EMD ... subject to a maximum of Rs 20 lakh") doesn't.
      const amount = parseAmount(rest.slice(0, 45));
      return amount && amount.rupees >= minRupees ? amount.printed : undefined;
    },
    { lookahead: 2, skip: before => isFraction(before) }
  );
}

/** GeM bids with item-wise evaluation print one EMD per schedule; no single figure applies then. */
export const SCHEDULE_WISE_EMD = 'as per the schedule-wise EMD in the bid document';

export function findEmdAmount(text: string): string | undefined {
  if ((text.match(/Schedule\s*\d+\s*EMD Amount/gi) ?? []).length > 1) return SCHEDULE_WISE_EMD;
  return findAmount(text, /\b(?:earnest money(?: deposit)?|E\.?M\.?D\.?(?: amount)?|bid security(?: deposit)?)\b/i, 500);
}
export const findEstimatedCost = (text: string) =>
  findAmount(text, /\b(?:estimated (?:cost|value)(?: (?:put to tender|of (?:the )?work))?|tender value|e\.?\s?c\.?\s?p\.?\s?t\.?)\b/i, 10000);

/** Finds the delay compensation rate and cap, e.g. "1.5% per month, maximum 10%". */
export function findDelayCompensation(text: string): string | undefined {
  const match = joinWrapped(text).match(
    /(\d+(?:\.\d+)?\s*%)\s*(?:per month|per mensem|p\.\s?m\.)[^.]{0,120}?(?:maximum|ceiling|limited to|max\.?)\s*(?:of\s*)?(\d+(?:\.\d+)?\s*%)/i
  );
  return match ? `${match[1].replace(/\s/g, '')} per month, maximum ${match[2].replace(/\s/g, '')}` : undefined;
}

/** PDF lines wrap mid-sentence; join lines within a page so a sentence reads as one. */
function joinWrapped(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map(block => block.replace(/-\n(?=[a-z])/g, '').replace(/\s*\n\s*/g, ' '))
    .join('\n');
}

/** Where the sentence holding `at` starts: the last full stop, colon-led row break or clause number before it. */
function sentenceStart(flat: string, at: number): number {
  const before = flat.slice(Math.max(0, at - 160), at);
  const breaks = [...before.matchAll(/(?<!\b(?:Rs|No|Nos|Cl|viz|i\.e|e\.g|Dt|Govt|M\/s))\.\s+|;\s+|\s(?=\(?[ivx]+\)\s|\(?[a-h]\)\s|\d+(?:\.\d+)+\s)/g)];
  const last = breaks[breaks.length - 1];
  if (last) return at - before.length + last.index! + last[0].length;
  // No break close by: start at the term itself rather than mid-word.
  return at;
}

/** Up to the end of the sentence that starts at `from`, capped so a table row doesn't run on. */
function sentenceEnd(flat: string, from: number, cap = 320): number {
  const rest = flat.slice(from, from + cap);
  const stop = rest.search(/(?<!\b(?:Rs|No|Nos|Cl|viz|i\.e|e\.g|Dt|Govt|M\/s))\.(?=\s|$)/);
  return from + (stop === -1 ? rest.length : stop + 1);
}

const tidyQuote = (s: string) => {
  const quote = s.replace(/\s+/g, ' ').trim();
  return /[.!?]$/.test(quote) ? quote : `${quote} …`;
};

const KEY_TERMS: Array<{ label: string; term: RegExp; prefer: RegExp; also?: RegExp }> = [
  { label: 'Compensation for delay (Clause 2)', term: /compensation for delay/gi, prefer: /\d\s*%/ },
  { label: 'Mobilisation advance', term: /mobili[sz]ation advance/gi, prefer: /\d\s*%/ },
  { label: 'Security deposit', term: /security deposit|retention money/gi, prefer: /\d\s*%/, also: /refund|releas|return/i },
  { label: 'Performance guarantee', term: /performance (?:guarantee|security)/gi, prefer: /\d\s*%/ },
];

/**
 * Clause 10CC as the tender states it. CPWD Schedule F prints it as a table row ("Clause 10 CC ... NOT APPLICABLE"),
 * and the row text itself can contain "applicable" ("to be applicable in contracts with ..."), so the decisive word
 * is the last applicability phrase before the next clause heading.
 */
function findPriceVariation(flat: string): string | undefined {
  for (const match of flat.matchAll(/Clause\s*10\s*CC\b/gi)) {
    const after = flat.slice(match.index!, match.index! + 300);
    const nextClause = after.slice(10).search(/\bClause\s*\d/i);
    const window = nextClause === -1 ? after : after.slice(0, nextClause + 10);
    const phrases = [
      ...window.matchAll(
        /\b(?:(?:shall|will|is)\s+not\s+be\s+applicable|not\s+applicable|(?:shall|will)\s+be\s+applicable|is\s+applicable|applicable)\b/gi
      ),
    ];
    const last = phrases[phrases.length - 1];
    if (!last) continue;
    // In a Schedule F table the "sentence" runs back through earlier rows; start at this clause's own row then.
    const sentence = sentenceStart(flat, match.index!);
    const start = /\bClause\s*\d/i.test(flat.slice(sentence, match.index!)) ? match.index! : sentence;
    let end = match.index! + last.index! + last[0].length;
    const stop = flat.slice(end, end + 80).search(/\.(?:\s|$)/);
    if (stop !== -1 && !/\bClause\s*\d/i.test(flat.slice(end, end + stop))) end += stop + 1;
    return tidyQuote(flat.slice(start, end)).replace(/ …$/, '.');
  }
  return undefined;
}

/**
 * Key contract terms quoted word for word from the tender, so the bid never depends on a model's paraphrase.
 * For each term: the first place it is followed closely by a figure, quoted from the start of its sentence to the
 * end (capped), plus the next sentence when that says how the amount is refunded. Unfilled template blanks
 * ("___%") are skipped.
 */
export function findKeyTerms(text: string): Array<{ label: string; text: string }> {
  const flat = joinWrapped(text).replace(/\n/g, ' ');
  const terms = KEY_TERMS.flatMap(({ label, term, prefer, also }) => {
    for (const match of flat.matchAll(term)) {
      let end = sentenceEnd(flat, match.index!);
      // The figure must be in the term's own sentence, not the next one.
      const window = flat.slice(match.index!, Math.min(end, match.index! + 200));
      if (!prefer.test(window) || /_{3,}/.test(window)) continue;
      const start = sentenceStart(flat, match.index!);
      if (also && !also.test(flat.slice(start, end))) {
        const next = sentenceEnd(flat, end);
        if (also.test(flat.slice(end, next))) end = next;
      }
      return [{ label, text: tidyQuote(flat.slice(start, end)).slice(0, 420) }];
    }
    return [];
  });
  const priceVariation = findPriceVariation(flat);
  if (priceVariation) terms.splice(1, 0, { label: 'Price variation (Clause 10CC)', text: priceVariation });
  return terms;
}

const WORK_NAME_LABEL =
  /\b(?:name of (?:the )?work(?: & location)?|subject|sub\.?|description of (?:the )?work|name of (?:the )?(?:project|assignment|services?))\b(?:\s*[:\-–])*\s*/i;
/** A following line that starts a new row ("2 Estimated cost : ...") ends the name. */
const NEXT_ROW = /^(?:\d+[.)]?\s|[A-Z][A-Za-z ()/.]{2,40}\s*[:\-–]\s)|^(?:estimated|earnest|time allowed|period|tender|nit|e-?tender|bid|issued|dear)\b/i;

/**
 * The name of work as the NIT prints it, e.g. "Name of work : Carrying out minor maintenance civil works of ...".
 * It often wraps over two or three lines; the next labelled row ends it.
 */
export function findNameOfWork(text: string): string | undefined {
  const lines = text.split('\n').slice(0, 600);
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(WORK_NAME_LABEL);
    if (!match || match.index! > 12) continue;
    let value = lines[i].slice(match.index! + match[0].length).trim();
    for (let j = i + 1; j < Math.min(i + 4, lines.length) && value.length < 250; j++) {
      const next = lines[j].trim();
      if (!next || NEXT_ROW.test(next) || /[.”"]$/.test(value)) break;
      value += ` ${next}`;
    }
    value = value.replace(/^[“"'‘]+|[”"'’]+$/g, '').replace(/\s+/g, ' ').replace(/[.”"’]+$/, '').trim();
    const words = value.split(' ');
    const readable = words.filter(w => /^[\p{L}][\p{L}&,().'-]{2,}$/u.test(w)).length / words.length;
    if (words.length < 4 || readable < 0.6 || /[|°]/.test(value) || /^(?:as per|of the|submission of)\b/i.test(value)) continue;
    return value.slice(0, 250);
  }
  return undefined;
}

/** Maintenance, repair and rate contracts: work comes as orders over the period, not one build sequence. */
export function isMaintenanceWork(nameOfWork: string | undefined, text: string): boolean {
  const name = nameOfWork ?? text.slice(0, 3000);
  return /\b(?:maintenance|repairs?|renovation|upkeep|white ?washing|painting|replacement|annual (?:rate|maintenance)|rate contract|work orders?)\b/i.test(name);
}

export type WorksType = 'building' | 'infrastructure' | 'maintenance';

/**
 * Building (a structure with floors, finishes and services), infrastructure (roads, bridges, drains, pipelines,
 * boundary walls) or maintenance (repair and rate contracts). Decides which methodology items and which kind of
 * programme the bid gets.
 */
export function findWorksType(nameOfWork: string | undefined, text: string): WorksType {
  if (isMaintenanceWork(nameOfWork, text)) return 'maintenance';
  const BUILDING = /\b(?:building|quarters|hostel|block|complex|storey|G\s?\+\s?\d|hospital|school|office|residential|auditorium|housing)\b/i;
  const INFRASTRUCTURE =
    /\b(?:road|highway|bridge|ROB|RUB|flyover|culvert|drain|pipeline|sewer|canal|embankment|bounda?ry wall|track|yard)\b/i;
  const name = nameOfWork ?? text.slice(0, 3000);
  // "Raising of boundary wall ... at Residential Complex": what is built comes before "at <place>".
  const object = name.split(/\s+at\s+/i)[0];
  for (const part of [object, name]) {
    if (BUILDING.test(part)) return 'building';
    if (INFRASTRUCTURE.test(part)) return 'infrastructure';
  }
  return 'building';
}

/** IS codes ("IS 1786" -> "1786") and concrete / steel grades ("M25", "Fe500") the whole tender mentions. */
export function findStandards(text: string): { isCodes: string[]; grades: string[] } {
  const isCodes = [...text.matchAll(/\bIS[:\s]*(\d{3,5})/g)].map(m => m[1]);
  const grades = [...text.matchAll(/\b(?:M\s?[-‐–]?\s?(\d{2})|Fe\s?[-‐–]?\s?(\d{3})\s?(?:D)?)\b/g)].map(m => (m[1] ? `M${m[1]}` : `Fe${m[2]}`));
  return { isCodes: [...new Set(isCodes)], grades: [...new Set(grades)] };
}

export type TenderKind = 'works' | 'supply' | 'services';

const KIND_SIGNALS: Record<TenderKind, RegExp> = {
  works:
    /\bname of (?:the )?work\b|\bconstruction\b|\bcivil works?\b|\bpercentage rate\b|\bitem rate\b|\bCPWD\b|\bschedule\s*['‘’]?F\b|\brepairs?\b|\brenovation\b|\bearthwork\b|\bRCC\b|\bROB\b|\bbridge\b|\bbuilding\b|\bmaintenance (?:civil|works)\b/gi,
  supply:
    /\bGeM\b|\bBid Number\b|\bsupply(?:ing)? of\b|\bsupply,?\s+(?:installation|delivery)\b|\bSITC\b|\bcommissioning\b|\bequipment\b|\brate contract\b|\bpurchase\b|\bconsignee\b|\bmake and model\b|\bitem category\b|\bwarranty\b|\bdelivery period\b|\bOEM\b|\bpre-dispatch inspection\b|\bpurchase order\b/gi,
  services:
    /\bhiring of\b|\bservices? provider\b|\bmanpower\b|\bsecurity (?:personnel|guards?|services)\b|\bhousekeeping\b|\boutsourc\w*|\bconsultan(?:cy|t)\b|\boperation and maintenance\b|\bannual maintenance contract\b|\bdeployment of\b|\bman-?months?\b|\bscope of services\b/gi,
};

/**
 * Works (build or repair), supply (goods, GeM) or services (manpower, security, consultancy, O&M): decides which
 * bid sections and proformas apply. The NIT head says what is being bought, so it counts three times.
 */
export function findTenderKind(text: string): TenderKind {
  const head = text.slice(0, 6000);
  const score = (kind: TenderKind) =>
    (head.match(KIND_SIGNALS[kind])?.length ?? 0) * 3 + Math.min(text.match(KIND_SIGNALS[kind])?.length ?? 0, 60);
  const ranked = (['works', 'supply', 'services'] as const)
    .map(kind => ({ kind, score: score(kind) }))
    .sort((a, b) => b.score - a.score);
  return ranked[0].score > 0 ? ranked[0].kind : 'works';
}

const OFFICE =
  /\b(?:Office of the\s+)?((?:Chief|Superintending|Executive|Divisional|Resident)\s+Engineer[^\n]{0,150}|(?:Chief\s+)?General Manager[^\n]{0,150}|(?:Municipal|Deputy|Additional)\s+Commissioner[^\n]{0,150})/i;

/** Finds the tender inviting office, e.g. "Office of the Executive Engineer, Pune Central Division-II, ...". */
export function findInvitingOffice(text: string): string | undefined {
  const lines = text.split('\n').slice(0, 400);
  const line = lines.find(l => /\bOffice of the\b/i.test(l) && OFFICE.test(l)) ?? lines.find(l => /\binvites?\b/i.test(l) && OFFICE.test(l));
  const office = line?.match(OFFICE)?.[1];
  return office
    ?.split(/\s+(?:invites?|on behalf|for and on behalf)\b/i)[0]
    .trim()
    .replace(/[.,;:]$/, '');
}

const SOURCE_HEAD_CHARS = 4000;
const SPEC_KEYWORDS = ['specification', 'grade', 'm20', 'm25', 'm30', 'fe500', 'fe 500', 'is:', 'is ', 'morth',
  'cpwd spec', 'rmc', 'griha', 'quality', 'testing', 'technical staff', 'plant', 'machinery'];

/** NIT head (key data) plus the chunks most about specs and resources, capped for Llama 3's 8k context. */
export function selectSourceText(fullText: string, chunks: TextChunk[]): string {
  let text = fullText.slice(0, SOURCE_HEAD_CHARS);
  // Chunks are rebuilt with single spaces, so locate them in a whitespace-collapsed copy.
  const flat = fullText.replace(/\s+/g, ' ');
  const headEnd = text.replace(/\s+/g, ' ').length;
  for (const chunk of chunks) {
    if (text.length >= SOURCE_TEXT_CHARS) break;
    const lower = chunk.text.toLowerCase();
    const position = flat.indexOf(chunk.text.slice(0, 200));
    if (position !== -1 && position < headEnd) continue; // starts inside the head
    if (SPEC_KEYWORDS.some(k => lower.includes(k))) text += `\n...\n${chunk.text}`;
  }
  return text.slice(0, SOURCE_TEXT_CHARS);
}

/** How many chunks fit one summary call: ~4.5k characters each against the ~21k-character prompt budget. */
const CHUNKS_PER_CALL = 4;

/**
 * The chunks most about a topic, in document order. A long tender mentions "EMD" or "date" on almost every page, so
 * taking the first chunks that mention a keyword only ever reads the first pages; ranking by how many distinct
 * keywords a chunk carries (and how often) finds the schedule or clause that actually sets the term.
 */
export function pickChunks(chunks: TextChunk[], keywords: string[], max = CHUNKS_PER_CALL): TextChunk[] {
  const scored = chunks
    .map(chunk => {
      const lower = chunk.text.toLowerCase();
      const counts = keywords.map(k => lower.split(k).length - 1);
      const distinct = counts.filter(c => c > 0).length;
      const total = counts.reduce((a, b) => a + Math.min(b, 5), 0);
      return { chunk, score: distinct * 3 + total };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.index - b.chunk.index)
    .slice(0, max)
    .map(s => s.chunk)
    .sort((a, b) => a.index - b.index);
  return scored.length > 0 ? scored : chunks.slice(0, max);
}

const joinChunks = (chunks: TextChunk[]) => chunks.map(c => c.text).join('\n\n');

/**
 * Tender summarization service (local Qwen model via Ollama)
 *
 * RULES:
 * - Faithful summarization only
 * - No hallucination
 * - No interpretation
 * - No judgment
 * - No scoring
 */
export class TenderSummarizationService {
  private model: string;
  private useLocalModel = false;
  private fallbackSections = 0;
  private maxTokensPerChunk: number;
  private overlapTokens: number;

  constructor(options: SummarizationOptions = {}) {
    this.model = options.model || AI_CONFIG.ANALYSIS_MODEL;
    this.maxTokensPerChunk = options.maxTokensPerChunk || 1024;
    this.overlapTokens = options.overlapTokens || 100;
  }

  /**
   * Summarize tender document
   * Main entry point for summarization
   */
  async summarizeTender(
    input: TenderDocumentInput,
    options: SummarizationOptions = {}
  ): Promise<SummarizationResult> {
    const startTime = Date.now();
    const diagnostics = {
      inputLength: input.fullText.length,
      chunksProcessed: 0,
      averageChunkLength: 0,
      totalTokensProcessed: 0,
      processingTimeMs: 0,
      errors: [] as string[],
      warnings: [] as string[],
    };

    try {
      // Step 1: Chunk the text
      const chunks = this.chunkText(input.fullText, input.chapters);
      diagnostics.chunksProcessed = chunks.length;
      diagnostics.totalTokensProcessed = chunks.reduce((sum, c) => sum + c.tokenCount, 0);
      diagnostics.averageChunkLength = diagnostics.totalTokensProcessed / chunks.length;

      if (chunks.length === 0) {
        diagnostics.errors.push('No text chunks generated from input');
        throw new Error('Empty input document');
      }

      // Step 2: Check the local model once, then generate each section.
      // Sequential on purpose: a local Ollama serves one request at a time.
      const health = await checkLlmHealth(this.model);
      this.useLocalModel = health.available;
      this.fallbackSections = 0;
      if (!health.available) {
        diagnostics.warnings.push(
          `Local model unavailable (${health.errorMessage}); used extractive fallback summaries`
        );
      }

      const executiveSummary = await this.generateExecutiveSummary(chunks);
      const commercialTerms = await this.generateCommercialTerms(chunks);
      const datesAndObligations = await this.generateDatesAndObligations(chunks);
      const technicalScope = await this.generateTechnicalScope(chunks);
      const legalHighlights = await this.generateLegalHighlights(chunks);
      const attentionPoints = await this.generateAttentionPoints(chunks);
      const eligibilityAndClauses = await this.generateEligibilityAndClauses(chunks);

      const processingTimeMs = Date.now() - startTime;
      diagnostics.processingTimeMs = processingTimeMs;

      const summary: TenderSummary = {
        executiveSummary,
        commercialTerms,
        datesAndObligations,
        technicalScope,
        legalHighlights,
        attentionPoints,
        eligibilityAndClauses,
        sourceText: selectSourceText(input.fullText, chunks),
        metadata: {
          tenderId: input.tenderId,
          tenderTitle: input.tenderTitle,
          generatedAt: new Date(),
          nitReference: findNitReference(input.fullText),
          completionMonths: findCompletionMonths(input.fullText),
          emdAmount: findEmdAmount(input.fullText),
          estimatedCost: findEstimatedCost(input.fullText),
          delayCompensation: findDelayCompensation(input.fullText),
          invitingOffice: findInvitingOffice(input.fullText),
          keyTerms: findKeyTerms(input.fullText),
          tenderKind: findTenderKind(input.fullText),
          standards: findStandards(input.fullText),
          nameOfWork: findNameOfWork(input.fullText),
          worksType: findWorksType(findNameOfWork(input.fullText), input.fullText),
          modelUsed: !this.useLocalModel
            ? 'extractive-fallback'
            : this.fallbackSections > 0
              ? `${this.model} (+${this.fallbackSections} extractive)`
              : this.model,
          totalChunks: chunks.length,
          processingTimeMs,
        },
      };

      return {
        summary,
        diagnostics,
      };
    } catch (error) {
      diagnostics.errors.push(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Chunk text so each model call stays inside the context window
   */
  private chunkText(fullText: string, chapters?: TenderDocumentInput['chapters']): TextChunk[] {
    const chunks: TextChunk[] = [];

    // If chapters are provided, chunk by chapter
    if (chapters && chapters.length > 0) {
      chapters.forEach((chapter, index) => {
        const chapterChunks = this.splitIntoChunks(
          chapter.content,
          `Chapter ${chapter.chapterId}: ${chapter.title}`
        );
        chunks.push(...chapterChunks.map((c, i) => ({
          ...c,
          index: chunks.length + i,
        })));
      });
    } else {
      // Otherwise, chunk the full text
      const textChunks = this.splitIntoChunks(fullText, 'Full Text');
      chunks.push(...textChunks);
    }

    return chunks;
  }

  /**
   * Split text into manageable chunks with overlap
   */
  private splitIntoChunks(text: string, source: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    const words = text.split(/\s+/);
    
    // Approximate tokens (1 token ≈ 0.75 words for English)
    const wordsPerChunk = Math.floor(this.maxTokensPerChunk * 0.75);
    const overlapWords = Math.floor(this.overlapTokens * 0.75);

    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < words.length) {
      const endIndex = Math.min(startIndex + wordsPerChunk, words.length);
      const chunkWords = words.slice(startIndex, endIndex);
      const chunkText = chunkWords.join(' ');

      chunks.push({
        index: chunkIndex,
        text: chunkText,
        tokenCount: Math.ceil(chunkWords.length / 0.75),
        source,
      });

      startIndex += wordsPerChunk - overlapWords;
      chunkIndex++;
    }

    return chunks;
  }

  /**
   * Generate Executive Summary
   * Focus: High-level project overview, scope, authority, value, duration
   */
  private async generateExecutiveSummary(chunks: TextChunk[]): Promise<string> {
    // Extract relevant chunks (typically first 3-5 chapters)
    const relevantChunks = chunks.filter(c => 
      c.source.includes('Chapter 01') || 
      c.source.includes('Chapter 02') ||
      c.source.includes('Chapter 03')
    ).slice(0, 5);

    const combinedText = relevantChunks.length > 0 
      ? relevantChunks.map(c => c.text).join('\n\n')
      : chunks.slice(0, 3).map(c => c.text).join('\n\n');

    return await this.summarize(
      combinedText,
      'Extract: project name, scope of work, executing authority, location, contract value, duration. Be factual and concise.'
    );
  }

  /**
   * Generate Commercial Terms
   * Focus: EMD, performance security, completion period, defect liability
   */
  private async generateCommercialTerms(chunks: TextChunk[]): Promise<string> {
    const combinedText = joinChunks(pickChunks(chunks, ['emd', 'earnest money', 'bid security', 'estimated cost',
      'performance guarantee', 'performance security', 'security deposit', 'completion', 'time allowed', 'defect liability']));

    return await this.summarize(
      combinedText,
      'Extract: EMD amount, performance guarantee, completion period, defect liability, tender type. List factually.'
    );
  }

  /**
   * Generate Dates and Obligations
   * Focus: Submission deadlines, validity, extension obligations
   */
  private async generateDatesAndObligations(chunks: TextChunk[]): Promise<string> {
    const combinedText = joinChunks(pickChunks(chunks, ['last date', 'due date', 'submission', 'opening', 'bid validity',
      'validity', 'pre-bid', 'deadline', 'hrs', 'time']));

    return await this.summarize(
      combinedText,
      'Extract: submission requirements, bid validity, extension obligations, key dates. Be specific.'
    );
  }

  /**
   * Generate Technical Scope
   * Focus: Nature of works, work categories, complexity (descriptive, not scored)
   */
  private async generateTechnicalScope(chunks: TextChunk[]): Promise<string> {
    // The name of work (first chunk) plus the chunks most about what is to be built or supplied.
    const picked = pickChunks(chunks, ['scope of work', 'name of work', 'specification', 'schedule of quantities',
      'bill of quantities', 'boq', 'supply of', 'grade', 'is:', 'is code', 'make', 'installation'], CHUNKS_PER_CALL - 1);
    const combinedText = joinChunks([chunks[0], ...picked.filter(c => c !== chunks[0])]);

    return await this.summarize(
      combinedText,
      'Extract: nature of the work, service or supply; the major items or work categories the tender itself names (do not add categories it does not name); quantities, grades and specifications as printed; execution scope. Describe factually, do not judge.'
    );
  }

  /**
   * Generate Legal Highlights
   * Focus: Bonds, guarantees, authority hierarchy, jurisdiction
   */
  private async generateLegalHighlights(chunks: TextChunk[]): Promise<string> {
    const combinedText = joinChunks(pickChunks(chunks, ['bank guarantee', 'guarantee', 'bond', 'indemnity',
      'jurisdiction', 'arbitration', 'dispute', 'termination', 'blacklist', 'debar', 'force majeure', 'penalty']));

    return await this.summarize(
      combinedText,
      'Extract: bond requirements, guarantee obligations, authority hierarchy, jurisdiction references. State what the tender requires.'
    );
  }

  /**
   * Generate Attention Points (FACTUAL ONLY)
   * Focus: Long execution periods, high security, extensive scope, repeated obligations
   * NOT A RISK ASSESSMENT - only factual summary
   */
  private async generateAttentionPoints(chunks: TextChunk[]): Promise<string> {
    const combinedText = joinChunks(pickChunks(chunks, ['shall be liable', 'forfeit', 'penalty', 'liquidated damages',
      'compensation', 'at his own cost', 'no claim', 'not be entertained', 'rejected', 'debar', 'mandatory', 'monsoon']));

    return await this.summarize(
      combinedText,
      'Extract: long execution periods, high security requirements, extensive technical scope, any repeated obligations. FACTUAL ONLY. Use phrasing like "The tender specifies..." or "The contractor is obligated to...". Do NOT use "should" or "may be risky".'
    );
  }

  /**
   * Eligibility criteria and the contract clauses that decide whether and how to bid.
   */
  private async generateEligibilityAndClauses(chunks: TextChunk[]): Promise<string> {
    const keywords = ['eligib', 'similar work', 'turnover', 'solvency', 'bid capacity', 'compensation for delay',
      'clause 2', '10cc', '10 cc', 'price variation', 'escalation', 'mobilisation', 'mobilization', 'secured advance',
      'security deposit', 'performance guarantee', 'arbitration', 'dispute'];
    const combinedText = joinChunks(pickChunks(chunks, keywords));

    return await this.summarize(
      combinedText,
      'Extract as bullet points: eligibility criteria (similar works thresholds, average annual turnover, solvency, bid capacity formula); ' +
        'compensation for delay and its cap; price variation / escalation clause (e.g. 10CC) and whether it applies; ' +
        'mobilisation or secured advance; security deposit (how it is recovered, and separately when it is refunded); ' +
        'performance guarantee (amount, deadline and any extension period); dispute resolution, arbitration and venue. ' +
        'Quote amounts, percentages and clause numbers exactly as written. For each clause, write "applies" or ' +
        '"does not apply" exactly as the tender states. Do not list documents to upload. Keep it under 200 words.',
      800
    );
  }

  /**
   * Summarize one section with the local model; fall back to extraction on any failure.
   */
  private async summarize(text: string, instruction: string, maxTokens = 600): Promise<string> {
    if (this.useLocalModel) {
      const result = await generateWithLlmSafe({
        model: this.model,
        systemPrompt:
          'You summarise Indian public-works tender documents for a contractor. ' +
          'Only state facts found in the provided text. If something is not in the text, say "Not specified in the tender." ' +
          'Quote every amount, percentage, period, clause number and named specification (e.g. M25, Fe500D, MoRTH) exactly as written. ' +
          'Answer in plain prose or short bullet points, under 250 words, with no preamble.',
        // ~4 chars per token; leave room in the context window for the prompt and answer.
        userPrompt: `Task: ${instruction}\n\nTender text:\n${text.slice(0, (AI_CONFIG.CONTEXT_TOKENS - 1024) * 3)}`,
        inferenceOptions: { temperature: 0.1, max_tokens: maxTokens },
      });
      if (result.success && result.data.content) return result.data.content;
      this.fallbackSections++;
      console.warn(`[Summarization] Local model call failed, using extractive fallback: ${
        result.success ? 'empty response' : result.error.message
      }`);
    }
    return this.extractiveSummary(text, instruction);
  }

  /** Keyword-based extraction used when the local model is unavailable. */
  private extractiveSummary(text: string, instruction: string): string {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    // Extract key sentences based on instruction keywords
    const keywords = this.extractKeywordsFromInstruction(instruction);
    const relevantLines = lines.filter(line => 
      keywords.some(keyword => line.toLowerCase().includes(keyword.toLowerCase()))
    );

    // Take top 5-10 most relevant sentences
    const summary = relevantLines.slice(0, 8).join(' ').substring(0, 500);

    // If no relevant lines found, take first few lines
    if (summary.length === 0) {
      return lines.slice(0, 5).join(' ').substring(0, 500);
    }

    return summary || 'Not explicitly specified in the tender document.';
  }

  /**
   * Extract keywords from instruction for mock summarization
   */
  private extractKeywordsFromInstruction(instruction: string): string[] {
    const keywords: string[] = [];
    
    // Common extraction patterns
    const patterns = [
      /EMD/i,
      /earnest money/i,
      /performance/i,
      /security/i,
      /completion/i,
      /duration/i,
      /period/i,
      /defect/i,
      /liability/i,
      /submission/i,
      /validity/i,
      /date/i,
      /deadline/i,
      /work/i,
      /specification/i,
      /technical/i,
      /bond/i,
      /guarantee/i,
      /authority/i,
      /jurisdiction/i,
      /contract/i,
      /value/i,
      /scope/i,
    ];

    for (const pattern of patterns) {
      if (pattern.test(instruction)) {
        const match = instruction.match(pattern);
        if (match) {
          keywords.push(match[0]);
        }
      }
    }

    return keywords;
  }
}

/**
 * Singleton instance for global use
 */
export const tenderSummarizationService = new TenderSummarizationService();
