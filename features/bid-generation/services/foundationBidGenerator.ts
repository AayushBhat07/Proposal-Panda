/**
 * Foundation bid generation (server-side).
 * Follows the Indian two-bid structure (CPWD / state PWD): Cover I technical bid with letter of transmittal,
 * document checklist, declarations, eligibility and bid capacity, scope, methodology, compliance and pre-bid
 * queries; Cover II price bid. Goods (GeM / store purchase) and services tenders get the same split with their
 * own methodology, eligibility proforma and queries, and no construction programme. Narrative sections come from the local Llama 3 model (AI_CONFIG.MODEL_NAME);
 * standard proformas come from bidTemplates.ts.
 */

import { AI_CONFIG } from '@/lib/config/constants';
import { checkLlmHealth, generateWithLlm } from '@/lib/llm/ollama';
import type { IntelligenceReport } from '@/features/intelligence-orchestrator/types/orchestration.types';
import type { CompanyProfile } from '@/types/onboarding.types';
import type { BidSection, FoundationBid } from '../types/bid.types';
import { TEMPLATE_SECTIONS, type TenderKind } from './bidTemplates';

type WorksType = 'building' | 'infrastructure' | 'maintenance';

/** Tender facts the draft checks compare against. */
export interface DraftFacts {
  months?: number;
  emdAmount?: string;
  /** The analysis' eligibility and key clauses summary */
  clauses: string;
  nitRef: string;
  tenderTitle: string;
  pan: string;
  gstin: string;
  delayCompensation?: string;
  invitingOffice?: string;
  /** Whether the scope includes a road, so the programme must schedule it */
  hasRoad?: boolean;
  /** IS code numbers that appear in the tender text or analysis */
  isCodes?: Set<string>;
  /** Key contract terms quoted from the tender text */
  keyTerms?: Array<{ label: string; text: string }>;
  sourceText?: string;
  /** Works, supply or services; defaults to works */
  kind?: TenderKind;
}

/** Methodology items in build order, each kept only when the tender text names it. */
const METHOD_ITEMS: Array<[string, RegExp]> = [
  ['earthwork and foundations', /earth ?work|excavation|foundation|footing|pile|embankment/i],
  ['RCC superstructure (concrete grade, steel grade)', /\bRCC\b|reinforced cement concrete|superstructure|column|slab/i],
  ['masonry', /masonry|brick ?work|block ?work|\bAAC\b/i],
  ['flooring and finishes', /flooring|tiles?\b|plaster|painting|false ceiling|finishes/i],
  ['waterproofing', /water ?proofing/i],
  ['water supply', /water supply/i],
  ['sanitary installations', /sanitary|plumbing|manhole/i],
  ['electrical installations', /electrical|wiring/i],
  ['roads', /\broad\b|carriageway|\bGSB\b|\bWMM\b|\bDBM\b|bituminous|paver/i],
  ['bridges and culverts', /bridge|\bROB\b|\bRUB\b|culvert|girder|\bpier\b|abutment/i],
  ['drainage', /drain|hume pipe|\bNP-?\s?[234]\b|cross drainage/i],
  ['GRIHA / green-building measures', /GRIHA|green[- ]building/i],
];
/** When the text names no item (a one-page notice), the common building items; GRIHA only if the tender asks. */
const METHOD_LIST = METHOD_ITEMS.map(([item]) => item).filter(item => !item.startsWith('GRIHA')).join('; ');

/** Items that belong to roads, bridges, drains and walls; a building's items there come from general conditions. */
const INFRASTRUCTURE_ITEMS = new Set(['earthwork and foundations', 'roads', 'bridges and culverts', 'drainage', 'GRIHA / green-building measures']);

/** The methodology items this tender names, in build order (the common ones when the text names none). */
export function methodologyItems(tenderText: string, worksType?: WorksType, nameOfWork = ''): string {
  const named = METHOD_ITEMS.filter(([, pattern]) => pattern.test(tenderText))
    .map(([item]) => item)
    .filter(item => worksType !== 'infrastructure' || INFRASTRUCTURE_ITEMS.has(item) || (item === 'masonry' && /\bwall\b/i.test(nameOfWork)));
  return named.length ? named.join('; ') : METHOD_LIST;
}

/** GRIHA, RMC and road terms appear in the briefs only when the tender itself mentions them. */
export function fitBriefToTender(brief: string, tenderText: string): string {
  let out = brief;
  if (!/GRIHA|green[- ]building/i.test(tenderText)) {
    out = out
      .replace(/;?\s*GRIHA \/ green-building measures/g, '')
      .replace(/, GRIHA(?= and|,)/g, '')
      .replace(/\bGRIHA, /g, '');
  }
  if (!/\bRMC\b|ready[- ]mix/i.test(tenderText)) out = out.replace(/,? ?RMC plant approval/g, '');
  if (!/\broad\b|carriageway|\bGSB\b|\bWMM\b/i.test(tenderText)) {
    out = out.replace(/ ?"Earthwork and foundations" means the building foundations, not the road; GSB, WMM, DBM and BC belong only to the road\./, '');
  }
  return out.replace(/\s*\(e\.g\.\s*\)/g, '').replace(/\s+\(e\.g\.\s*,\s*/g, ' (e.g. ').replace(/\s+,/g, ',');
}

/** Removes lines that match, then renumbers the numbered ones 1, 2, 3... */
export function dropLines(content: string, pattern: RegExp): string {
  let n = 0;
  return content
    .split('\n')
    .filter(line => !pattern.test(line))
    .map(line => line.replace(/^(\s*)\d+([.)]\s)/, (_, indent: string, sep: string) => `${indent}${++n}${sep}`))
    .join('\n');
}

/** Contract terms the compliance block quotes from the tender, so the model's own lines on them are dropped. */
const QUOTED_TERMS =
  /security deposit|mobili[sz]ation|secured advance|compensation for delay|10\s*CC|price variation|escalation|defect liability|\bcess\b|^\W*\[as per enclosed registration certificates\]\W*$/i;

/** Pre-bid queries that misquote the tender or ask what it already answers. */
const BAD_QUERY =
  /^(?=.*10\s*CC)(?!.*(?:price|escalat|variation))|security deposit.{0,60}recover|recover.{0,60}security deposit|late fee|provision for (?:any )?(?:price variation|escalation)|how (?:will|shall|should) the contractor|absence of|\black(?:s|ing)? (?:a|any|clear)|not (?:clearly )?(?:mentioned|specified|provided|defined)|does not (?:include|contain|mention|specify|provide)/i;

const IS_CODE = /\bIS[:\s]*(\d{3,5})(?:\s*\(?\s*(?:Part|Pt\.?)\s*\d+\s*\)?)?(?:\s*[:\-–]\s*\d{4})?/g;

/** IS code numbers mentioned in a text, e.g. "IS 2185 (Part 3)" -> "2185". */
export function isCodesIn(text: string): Set<string> {
  return new Set([...text.matchAll(IS_CODE)].map(m => m[1]));
}

const GRADE = /\b(?:M\s?-?\s?(\d{2})|Fe\s?-?\s?(\d{3})\s?(?:D)?)\b/g;

/** Concrete and steel grades mentioned in a text, e.g. "M25" -> "M25", "Fe 500D" -> "Fe500". */
export function gradesIn(text: string): Set<string> {
  return new Set([...text.matchAll(GRADE)].map(m => (m[1] ? `M${m[1]}` : `Fe${m[2]}`)));
}

/** Replaces concrete / steel grades the tender never mentions ("M25", "Fe 500D" in a tender that has neither). */
export function redactUnknownGrades(content: string, known: Set<string>): string {
  return content.replace(GRADE, (match, m: string, fe: string) =>
    known.has(m ? `M${m}` : `Fe${fe}`) ? match : m ? '[concrete grade as per tender]' : '[steel grade as per tender]'
  );
}

/** Replaces IS codes the tender never mentions, so a plausible but wrong standard can't slip into the bid. */
export function redactUnknownStandards(content: string, known: Set<string>): string {
  return content.replace(IS_CODE, (match, code: string) => (known.has(code) ? match : '[IS code as per tender]'));
}

/** Lines of the clause summary the compliance statement must carry verbatim. */
const KEY_CLAUSE = /clause\s*2\b|compensation for delay|10\s*CC|price variation|escalation|\badvance\b|security deposit/i;

/**
 * Key contract clauses copied from the analysis, so the compliance statement can't drop or flip them.
 * A heading keeps its value lines: indented lines, or the line after a heading that ends with ":".
 */
export function keyClauseLines(clauses: string, delayCompensation?: string): string[] {
  const groups: Array<{ indent: number; parts: string[]; open: boolean }> = [];
  for (const raw of clauses.split('\n')) {
    if (!raw.trim()) continue;
    const indent = raw.match(/^\s*/)![0].length;
    const text = raw.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim();
    const current = groups.at(-1);
    if (current && (indent > current.indent || (current.open && !text.endsWith(':')))) {
      current.parts.push(text);
      current.open = false;
    } else {
      groups.push({ indent, parts: [text], open: text.endsWith(':') });
    }
  }
  const lines = groups.map(g => g.parts.join(' ')).filter(line => KEY_CLAUSE.test(line));
  if (delayCompensation && !lines.some(l => l.includes(delayCompensation.split(' ')[0]))) {
    lines.unshift(`Compensation for delay (Clause 2): ${delayCompensation}`);
  }
  return lines;
}

/** Order the trades must start in; each must not begin before the one listed before it. */
const BUILD_ORDER: Array<[string, RegExp]> = [
  ['foundations', /foundation|footing|excavation/i],
  ['RCC frame', /rcc|frame|superstructure|slab/i],
  ['masonry', /\baac\b|block ?work|brick ?work|masonry (?:walls?|work)/i],
  ['flooring and finishes', /flooring|tiling|tiles|finish|painting/i],
];

const ROAD_WORK = /road|carriageway|pavement|bituminous/i;

/** First month in the programme whose activities match. */
function firstMonth(plan: Map<number, string>, pattern: RegExp): number | undefined {
  const months = [...plan].filter(([, a]) => pattern.test(a)).map(([m]) => m);
  return months.length ? Math.min(...months) : undefined;
}

/**
 * needsSource: also give the model the selected raw tender text, for exact terms and specs.
 * maxTokens: output budget (default 900).
 * check: extra check on the draft; returns a problem description or undefined.
 * finish: turns the checked draft into the final section text.
 */
type ModelSection = Omit<BidSection, 'content' | 'source'> & {
  brief: string;
  needsSource?: boolean;
  maxTokens?: number;
  /** Deterministic cleanup before the checks, e.g. dropping lines the model may not write */
  clean?: (content: string) => string;
  check?: (content: string, facts: DraftFacts) => string | undefined;
  finish?: (content: string, facts: DraftFacts) => string;
};

export const MODEL_SECTIONS: Record<string, ModelSection> = {
  transmittal: {
    id: 'letter-of-transmittal',
    title: 'Letter of Transmittal',
    cover: 'technical',
    brief:
      'The body of a formal letter of transmittal to the Executive Engineer, in the CPWD style, starting at ' +
      '"Sir," (the address and subject line are added separately): list the documents enclosed in Cover I (EMD, registration, financial ' +
      'information, similar works, affidavits), confirm the financial bid is submitted separately in Cover II, and ' +
      'confirm acceptance of all tender conditions. Use the NIT reference from KEY FIGURES exactly, and state the ' +
      'EMD amount from KEY FIGURES in figures. Do not cite clause numbers and do not restate eligibility thresholds. ' +
      'Do not describe the bidder\'s capabilities or experience. Do not mention any quoted price. End with a ' +
      'signatory block: Yours faithfully, [Name], [Designation], for <company name>.',
    check: (content, { emdAmount }) =>
      emdAmount?.startsWith('Rs.') && !content.replace(/\s/g, '').includes(emdAmount.replace(/^Rs\.\s*/, ''))
        ? 'it does not state the EMD amount'
        : undefined,
    finish: (content, { nitRef, tenderTitle, invitingOffice, kind = 'works' }) =>
      [
        'To,',
        ...(invitingOffice
          ? `The ${invitingOffice}`.split(/,\s*/).map((part, i, all) => (i < all.length - 1 ? `${part},` : part))
          : kind === 'works'
            ? ['The Executive Engineer,', '[Division and address as per NIT]']
            : ['[Designation of the tender inviting authority],', '[Address as per NIT]']),
        '',
        `Sub: Submission of bid for "${tenderTitle}" against NIT No. ${nitRef}`,
        '',
        content.replace(/^\s*(?:To,?[\s\S]*?)?(?=(?:Dear )?Sir)/i, ''),
      ].join('\n'),
  },
  scope: {
    id: 'scope-understanding',
    title: 'Understanding of Scope of Work',
    cover: 'technical',
    brief: 'Restate the scope of work, location, completion period and key deliverables to show the tender was understood.',
  },
  methodology: {
    id: 'methodology',
    title: 'Construction Methodology',
    cover: 'technical',
    brief:
      'Construction methodology, one short paragraph per item, in this order: {methodItems}. In each paragraph name only the specifications and standards the tender ' +
      'text gives for that item, copied as written with their figures (layer names and thicknesses, widths, grades), ' +
      'the sequence of work, and the physical or laboratory tests that apply to that item. Attach a standard only to ' +
      'the item the tender text uses it for. ' +
      'Never invent materials or methods the tender does not state, and never expand an abbreviation unless the ' +
      'tender text does. "Earthwork and foundations" means the building foundations, not the road; GSB, WMM, DBM and ' +
      'BC belong only to the road. Give no dimensions, depths or thicknesses unless the tender text states them. ' +
      'Then one paragraph on safety and one line ' +
      '"Key technical staff and plant: [to be listed]". Do not write a work programme. ' +
      'Do not repeat text between items and do not end with a note or disclaimer.',
    needsSource: true,
    maxTokens: 1600,
    check: (content, { sourceText = '' }) => {
      const depth = content.match(/depth of (\d+(?:\.\d+)?)\s*m/i);
      return depth && !sourceText.includes(depth[1]) ? `it invents a depth ("${depth[0]}")` : undefined;
    },
  },
  programme: {
    id: 'work-programme',
    title: 'Work Programme',
    cover: 'technical',
    brief:
      'A month-by-month work programme. Write exactly one line per month, from "Month 1:" to "Month {completionMonths}:", ' +
      'each followed by the activities in that month. Follow the build order: mobilisation, foundations, RCC frame ' +
      'floor by floor, masonry, services rough-in, ' +
      'waterproofing, flooring and finishes, services fixtures, then testing and handover. Spread the building work ' +
      'across the whole period, so finishes run into the last third and testing and handover take only the last ' +
      'month. Schedule any external ' +
      'road and drainage works in their own months outside the monsoon (June to September), alongside the building ' +
      'work. Output only those lines.',
    check: (content, { months }) => {
      const plan = parseProgramme(content);
      if (plan.size < Math.ceil((months ?? 2) / 2)) return `it plans only ${plan.size} month(s)`;
      const idle = [...plan.values()].filter(a => /^[^;]*\b(?:testing|handover|commissioning)\b[^;]*$/i.test(a) && !/finish|work|install/i.test(a)).length;
      if (idle > 2) return `it leaves ${idle} months for testing and handover only`;
      let previous: [string, number] | undefined;
      for (const [trade, pattern] of BUILD_ORDER) {
        const start = firstMonth(plan, pattern);
        if (start === undefined) continue;
        if (previous && start < previous[1]) return `it starts ${trade} before ${previous[0]}`;
        previous = [trade, start];
      }
      return undefined;
    },
    finish: (content, { months, hasRoad }) => renderProgramme(content, months, hasRoad),
  },
  compliance: {
    id: 'compliance-statement',
    title: 'Compliance with Tender Conditions',
    cover: 'technical',
    brief:
      'A numbered compliance statement: for each submission, EMD, eligibility, technical, quality, GRIHA, labour and ' +
      'legal requirement found in the analysis, one line stating how the bidder complies. Leave out compensation ' +
      'for delay, price variation, advances, security deposit, defect liability and cess: those terms are quoted ' +
      'from the NIT separately. ' +
      'Do not restate the bidder\'s GSTIN, PAN or any registration; write "[as per enclosed registration certificates]". ' +
      'For eligibility criteria (similar works, turnover, no-loss, solvency, bid capacity) never assert the bidder ' +
      'meets them: write "Supporting documents enclosed at [Annexure __]; to be confirmed from company records." ' +
      'Never mark a clause as not applicable. Never comment on the estimated cost, budget or price: the price is ' +
      'quoted only in Cover II. Address each flagged risk and submission trap factually. Do not comment on clauses the tender does not contain.',
    needsSource: true,
    check: (content, { clauses }) => {
      const wrong = [...content.matchAll(/Clause\s*(\d+[A-Z]*)\b[^\n]{0,80}?\bdoes not apply/gi)]
        .map(m => m[1])
        .find(c => !new RegExp(`\\b${c}\\b[^\\n]{0,80}?does not apply`, 'i').test(clauses));
      return wrong ? `it says Clause ${wrong} does not apply, which the tender analysis does not` : undefined;
    },
    clean: content => dropLines(content, QUOTED_TERMS),
    finish: (content, { clauses, delayCompensation, keyTerms = [] }) => {
      if (keyTerms.length) {
        const quoted = keyTerms.map(t => `- ${t.label}: "${t.text}"`).join('\n');
        return `${content}\n\nKey contract terms (quoted from the NIT; accepted as stated):\n${quoted}`;
      }
      const lines = keyClauseLines(clauses, delayCompensation);
      return lines.length
        ? `${content}\n\nKey contract clauses (from the tender analysis; verify against the NIT):\n${lines.map(l => `- ${l}`).join('\n')}`
        : content;
    },
  },
  queries: {
    id: 'pre-bid-queries',
    title: 'Pre-bid Queries and Clarifications',
    cover: 'technical',
    brief:
      'Between 8 and 10 numbered pre-bid queries (1., 2., ...) the contractor should raise with the department, and nothing else. ' +
      'Never ask about anything the tender already states clearly (deadlines, EMD, forms, how security deposit is ' +
      'recovered). Do not repeat a query. Cite a clause number only if the analysis gives that number for the very term you ask about. Focus on ambiguous or ' +
      'onerous conditions: delay compensation and its cap, price variation / escalation, advances, third-party ' +
      'approvals or certification costs (e.g. GRIHA, RMC plant approval), site access and utilities. ' +
      'Never claim the tender lacks something; only ask about what is unclear. ' +
      'Keep each query to one or two sentences.',
    clean: content => dropLines(content, BAD_QUERY),
    check: content => {
      const count = content.match(/^\s*\d+[.)]\s/gm)?.length ?? 0;
      return count < 5 ? `it has only ${count} usable numbered queries` : undefined;
    },
  },
};

/** Statements a draft must never make: they are eligibility facts only company records can supply. */
const INVENTED_CLAIMS =
  /\b(?:our|the) (?:company|firm)\b[^.]{0,40}\b(?:has|have|had) (?:successfully )?(?:completed|executed)|\bturnover\b[^.]{0,80}\bwas (?:Rs|INR|₹)|\b(?:our|its) [^.]{0,30}\bturnover\b[^.]{0,60}\b(?:is|of) (?:Rs|INR|₹)|has not (?:incurred|suffered) (?:any )?loss|(?:have|has|possess) (?:the )?(?:necessary|requisite|adequate) (?:technical |financial )?(?:capabilit|capacit|experience)|we (?:meet|fulfil|fulfill|satisfy) (?:all )?(?:the )?eligibility|\bour (?:technical )?(?:capabilit\w*|experience|expertise|track record)\b|\bideal candidate\b|\bwell[- ]equipped\b|\b(?:has|have|holds?|possess(?:es)?) (?:a |the )?(?:valid )?[^.]{0,30}\b(?:EPF|ESI|ESIC|PF)\b|within the [^.]{0,30}\b(?:budget|estimated cost)\b|\bbid meets all (?:the )?requirements\b|detailed project reports|good strength base|well manufactured macadam|chartered accountant[^.]{0,40}\b(?:concrete|test|cube|quality)|(?:concrete|test|cube|quality)[^.]{0,60}chartered accountant/i;

const PAN_SHAPE = /\b[A-Z]{5}\s?\d{4}\s?[A-Z]\b|\b[A-Z]{4}\s[A-Z]\d{4}[A-Z]\b/g;
const GSTIN_SHAPE = /\b\d{2}\s?[A-Z]{5}\s?\d{4}[A-Z]\d[A-Z][A-Z\d]\b/g;

/** Returns why a model draft can't be used, or undefined if it passes. */
export function findDraftProblem(section: ModelSection, content: string, facts: DraftFacts): string | undefined {
  const claim = content.match(INVENTED_CLAIMS);
  if (claim) return `it states company facts not in the profile ("${claim[0]}")`;
  const ids = [...content.matchAll(PAN_SHAPE), ...content.matchAll(GSTIN_SHAPE)].map(m => m[0]);
  const wrongId = ids.find(id => id !== facts.pan && id !== facts.gstin && !facts.gstin.includes(id));
  if (wrongId) return `it misquotes a tax ID ("${wrongId}")`;
  return section.check?.(content, facts);
}

/** Drops the model's "Here is the ... section:" preamble and a closing "Note:" disclaimer. */
export function tidyDraft(content: string): string {
  return content
    .replace(/^\s*Here is[^\n]*:\s*\n/i, '')
    .replace(/\n\s*\**Note\b[^\n]*(?:\n(?!\s*\n)[^\n]*)*\s*$/i, '')
    .replace(/\n\s*(?:Please note|Note that|This section (?:only )?provides|The above (?:is|are|methodology))[^\n]*(?:\n(?!\s*\n)[^\n]*)*\s*$/i, '')
    .trim();
}

/**
 * Month -> activities from a draft programme. Accepts "Month 3:", "Months 2-4:", "Month 16 to 18 -" and table rows
 * like "| Month 1-3 | ... |"; ranges are expanded and the defect liability period is dropped.
 */
export function parseProgramme(draft: string): Map<number, string> {
  const byMonth = new Map<number, string>();
  for (const line of draft.split('\n')) {
    const m = line.match(/Months?\s*(\d{1,2})(?:\s*(?:-|–|to)\s*(?:Months?\s*)?(\d{1,2}))?\s*[:|\-–]\s*(.+)/i);
    if (!m) continue;
    const activities = m[3]
      .replace(/\s*\((?:approx\w*|about)[^)]*\)/gi, '')
      .replace(/\s*\|\s*/g, '; ')
      .replace(/[,;]?\s*(?:and )?defect liability period[^,;.]*/gi, '')
      .trim()
      .replace(/^[,;]\s*|[,;]$/g, '');
    if (!activities) continue;
    const from = Number(m[1]);
    const to = m[2] ? Number(m[2]) : from;
    for (let month = from; month <= to; month++) if (!byMonth.has(month)) byMonth.set(month, activities);
  }
  return byMonth;
}

/** One line per month from Month 1 to the completion month; months the draft skipped are left to plan. */
export function renderProgramme(draft: string, months: number | undefined, hasRoad = false): string {
  const byMonth = parseProgramme(draft);
  const last = months ?? Math.max(0, ...byMonth.keys());
  // Llama 3 tends to drop the external works; schedule them in the last three months rather than lose them.
  if (hasRoad && ![...byMonth.values()].some(a => ROAD_WORK.test(a))) {
    for (let month = Math.max(1, last - 2); month <= last; month++) {
      const current = byMonth.get(month);
      byMonth.set(month, `${current ? `${current.replace(/\.$/, '')}; ` : ''}approach road and drainage works (outside monsoon)`);
    }
  }
  const lines = Array.from({ length: last }, (_, i) => `Month ${i + 1}: ${byMonth.get(i + 1) ?? '[activities to be planned]'}`);
  return [
    ...lines,
    '',
    'The defect liability period runs from the date of completion and is not part of this programme.',
  ].join('\n');
}

const KIND_NOUN: Record<TenderKind, string> = { works: 'work', supply: 'supply', services: 'services' };

/** The works sections reworded for goods and services tenders; anything not listed is shared. */
export function sectionsFor(kind: TenderKind): typeof MODEL_SECTIONS {
  if (kind === 'works') return MODEL_SECTIONS;
  const noun = KIND_NOUN[kind];
  return {
    ...MODEL_SECTIONS,
    transmittal: {
      ...MODEL_SECTIONS.transmittal,
      brief: MODEL_SECTIONS.transmittal.brief
        .replace('to the Executive Engineer, in the CPWD style,', 'to the tender inviting authority,')
        .replace('(EMD, registration, financial information, similar works, affidavits)', '(EMD or bid security declaration, registrations, financial information, past orders, declarations)'),
    },
    scope: {
      ...MODEL_SECTIONS.scope,
      title: `Understanding of Scope of ${kind === 'supply' ? 'Supply' : 'Services'}`,
      brief: `Restate the scope of ${noun}, the place of ${kind === 'supply' ? 'delivery / consignees' : 'service'}, the ${kind === 'supply' ? 'delivery' : 'contract'} period and the key deliverables, as the tender states them, to show the tender was understood.`,
    },
    methodology:
      kind === 'supply'
        ? {
            id: 'supply-plan',
            title: 'Supply, Delivery and Quality Plan',
            cover: 'technical',
            brief:
              'How the bidder will supply the items, one short paragraph each: sourcing of the items to the ' +
              'specifications the tender text gives (write the make and model as [make / model]); inspection and ' +
              'testing before dispatch, as the tender states; packing and delivery to the consignee(s) within the ' +
              'delivery period; installation, commissioning and training only if the tender asks for them; warranty ' +
              'and after-sales support for the period the tender states. Copy specifications and periods exactly; ' +
              'never invent a brand, model, certificate or period. Do not end with a note or disclaimer.',
            needsSource: true,
            maxTokens: 1200,
          }
        : {
            id: 'service-methodology',
            title: 'Service Delivery Methodology',
            cover: 'technical',
            brief:
              'How the bidder will deliver the services, one short paragraph each: mobilisation and deployment by the ' +
              'start date; manpower by category and number exactly as the tender states (or [number] if it does not); ' +
              'shifts, supervision and attendance; statutory obligations the tender names (minimum wages, EPF, ESI, ' +
              'licences) stated as obligations the bidder will meet; reporting to the department; meeting the service ' +
              'levels and penalties the tender states; replacement and leave reserve. Never invent numbers, rates or ' +
              'licences. Do not end with a note or disclaimer.',
            needsSource: true,
            maxTokens: 1200,
          },
    compliance: {
      ...MODEL_SECTIONS.compliance,
      brief: MODEL_SECTIONS.compliance.brief
        .replace('technical, quality, GRIHA, labour and legal requirement', `technical, ${kind === 'supply' ? 'inspection, warranty' : 'manpower, statutory'} and legal requirement`)
        .replace('(similar works, turnover, no-loss, solvency, bid capacity)', `(similar ${kind === 'supply' ? 'supplies' : 'services'}, turnover, OEM authorisation, registrations)`),
    },
    queries: {
      ...MODEL_SECTIONS.queries,
      brief: MODEL_SECTIONS.queries.brief
        .replace('the contractor should raise', 'the bidder should raise')
        .replace(
          'delay compensation and its cap, price variation / escalation, advances, third-party approvals or certification costs (e.g. GRIHA, RMC plant approval), site access and utilities.',
          kind === 'supply'
            ? 'specifications that are ambiguous or point to one brand, delivery period and consignee locations, inspection and acceptance, warranty start and scope, liquidated damages, and payment terms.'
            : 'manpower numbers and categories, how minimum wage and statutory revisions are paid, penalties and service levels, equipment or consumables the bidder must provide, contract extension, and payment cycle.'
        ),
    },
  };
}

/** Maintenance and repair works: work orders over the period, so no foundation-to-handover build sequence. */
export const MAINTENANCE_PROGRAMME: ModelSection = {
  ...MODEL_SECTIONS.programme,
  brief:
    'A month-by-month plan for this maintenance / repair contract. Write exactly one line per month, from "Month 1:" ' +
    'to "Month {completionMonths}:", each listing the maintenance or repair activities the tender names, taken up as ' +
    'the department issues work orders, with mobilisation in Month 1 and any monsoon-sensitive work (roofing, ' +
    'external painting, road patching) outside June to September. Do not add new construction stages (foundations, ' +
    'RCC frame) that the tender does not name. Output only those lines.',
  check: (content, { months }) => {
    const plan = parseProgramme(content);
    if (plan.size < Math.ceil((months ?? 2) / 2)) return `it plans only ${plan.size} month(s)`;
    const invented = [...plan.values()].find(a => /\bRCC frame\b|\bsuperstructure\b|floor by floor/i.test(a));
    return invented ? `it schedules new construction ("${invented}") in a maintenance contract` : undefined;
  },
};

/** Roads, bridges, drains and walls: the activities the tender names in a buildable order, no building stages. */
export const INFRASTRUCTURE_PROGRAMME: ModelSection = {
  ...MODEL_SECTIONS.programme,
  brief:
    'A month-by-month work programme. Write exactly one line per month, from "Month 1:" to "Month {completionMonths}:", ' +
    'each listing only activities the tender itself names, in the order they can be built, with mobilisation in ' +
    'Month 1, work affected by rain kept outside June to September, and testing and handover only in the last ' +
    'month. Do not add building stages (RCC frame, masonry, flooring) or road layers the tender does not name. ' +
    'Output only those lines.',
  check: (content, { months }) => {
    const plan = parseProgramme(content);
    if (plan.size < Math.ceil((months ?? 2) / 2)) return `it plans only ${plan.size} month(s)`;
    const invented = [...plan.values()].find(a => /\bRCC frame\b|floor by floor|\bmasonry\b|\bflooring\b/i.test(a));
    return invented ? `it schedules building work ("${invented}") the tender does not name` : undefined;
  },
};

/** Final order of the bid for a tender kind, mixing model-drafted sections and standard proformas. */
function bidOrder(kind: TenderKind, worksType?: WorksType): Array<ModelSection | (typeof TEMPLATE_SECTIONS)[number]> {
  if (kind === 'works' && worksType && worksType !== 'building') {
    const programme = worksType === 'maintenance' ? MAINTENANCE_PROGRAMME : INFRASTRUCTURE_PROGRAMME;
    return BID_ORDER.map(section => (section === MODEL_SECTIONS.programme ? programme : section));
  }
  const sections = sectionsFor(kind);
  const template = (id: string) => TEMPLATE_SECTIONS.find(t => t.id === id)!;
  return kind === 'works'
    ? BID_ORDER
    : [
        sections.transmittal,
        template('document-checklist'),
        { ...template('declarations'), title: 'Tender Acceptance Letter and Affidavit' },
        template('past-experience'),
        sections.scope,
        sections.methodology,
        sections.compliance,
        sections.queries,
        template('financial-bid'),
      ];
}

const ROLE: Record<TenderKind, string> = {
  works: 'an Indian civil-works contractor responding to a CPWD / state PWD tender',
  supply: 'an Indian supplier responding to a government goods tender (GeM or an e-procurement portal)',
  services: 'an Indian service provider responding to a government services tender',
};

const EDIT_NEEDED = (problem: string) =>
  `[Edit needed: the local model's draft of this section was withheld because ${problem}. Write this section manually.]`;

/** Final order of the bid, mixing model-drafted sections and standard proformas. */
const BID_ORDER: Array<ModelSection | (typeof TEMPLATE_SECTIONS)[number]> = [
  MODEL_SECTIONS.transmittal,
  TEMPLATE_SECTIONS.find(t => t.id === 'document-checklist')!,
  TEMPLATE_SECTIONS.find(t => t.id === 'declarations')!,
  TEMPLATE_SECTIONS.find(t => t.id === 'bid-capacity')!,
  MODEL_SECTIONS.scope,
  MODEL_SECTIONS.methodology,
  MODEL_SECTIONS.programme,
  MODEL_SECTIONS.compliance,
  MODEL_SECTIONS.queries,
  TEMPLATE_SECTIONS.find(t => t.id === 'financial-bid')!,
];

const systemPrompt = (kind: TenderKind) =>
  `You draft bid documents for ${ROLE[kind]} ` +
  'under the two-bid system (Cover I technical, Cover II financial). ' +
  'Use only the facts in the tender analysis, tender text and company profile provided. ' +
  'Copy figures that appear there (EMD, estimated cost, periods, percentages, clause numbers) exactly. ' +
  'Only for facts that are absent, write a bracketed placeholder such as [insert value]; never invent figures, dates, ' +
  'certificates or past projects. Always refer to the bidder by its company name, never a placeholder. ' +
  'Never add commitments beyond the tender conditions, and never state acceptance of risks or of clauses the tender lacks. ' +
  'Never state that the bidder has any experience, completed works, turnover, profit, solvency or bid capacity ' +
  'unless it is in the company profile; a false eligibility declaration gets a bid rejected and the contractor debarred. ' +
  'Do not write calendar dates; use [dd/mm/yyyy]. For a period the text does not give, write [insert period]. ' +
  'Write in formal English, ready for the contractor to edit. Output only the section body, without a heading.';

export class BidModelUnavailableError extends Error {}

function buildKeyFigures(report: IntelligenceReport, nitRef: string, kind: TenderKind): string {
  const { metadata } = report.summary;
  const period = kind === 'works' ? 'Completion period' : kind === 'supply' ? 'Delivery period' : 'Contract period';
  return [
    'KEY FIGURES (copy exactly):',
    `- NIT reference: ${nitRef}`,
    `- Name of ${KIND_NOUN[kind]}: ${metadata.nameOfWork ?? metadata.tenderTitle}`,
    `- Estimated cost: ${metadata.estimatedCost ?? '[insert value]'}`,
    `- EMD: ${metadata.emdAmount ?? '[insert value]'}`,
    `- ${period}: ${metadata.completionMonths ? `${metadata.completionMonths} months` : '[insert period]'}`,
  ].join('\n');
}

function buildContext(report: IntelligenceReport, company: CompanyProfile): string {
  const { summary, compliance } = report;
  return [
    `BIDDER: ${company.legalName}`,
    `Executive summary: ${summary.executiveSummary}`,
    `Commercial terms: ${summary.commercialTerms}`,
    `Dates and obligations: ${summary.datesAndObligations}`,
    `Technical scope: ${summary.technicalScope}`,
    `Legal highlights: ${summary.legalHighlights}`,
    `Attention points: ${summary.attentionPoints}`,
    `Eligibility and key clauses: ${summary.eligibilityAndClauses ?? 'not extracted'}`,
    `Risk level: ${compliance.riskLevel}; identified risks: ${compliance.identifiedRisks.map(r => `${r.category}: ${r.description}`).join('; ') || 'none'}`,
    `Missing or weak clauses: ${compliance.missingOrWeakClauses.map(c => `${c.clause} (${c.reason})`).join('; ') || 'none'}`,
    `Submission traps: ${compliance.submissionTraps.join('; ') || 'none'}`,
    '',
    `CONTRACTOR: ${company.legalName}, registration class ${company.registrationClass}, GSTIN ${company.gstin}, PAN ${company.panNumber}, address ${company.registeredAddress}`,
  ].join('\n');
}

export async function generateFoundationBid(
  report: IntelligenceReport,
  company: CompanyProfile
): Promise<FoundationBid> {
  const model = AI_CONFIG.MODEL_NAME;
  const health = await checkLlmHealth(model);
  if (!health.available) {
    throw new BidModelUnavailableError(`Local bid model is not available: ${health.errorMessage}`);
  }

  const tenderId = report.summary.metadata.tenderId;
  // The name of work as the NIT prints it beats whatever label the tender was uploaded under.
  const tenderTitle = report.summary.metadata.nameOfWork ?? report.summary.metadata.tenderTitle;
  const months = report.summary.metadata.completionMonths;
  // The internal tenderId never goes into the bid; only the reference printed on the NIT does.
  const nitRef = report.summary.metadata.nitReference ?? '[NIT No.]';
  const kind: TenderKind = report.summary.metadata.tenderKind ?? 'works';
  const keyFigures = buildKeyFigures(report, nitRef, kind);
  const facts: DraftFacts = {
    months,
    emdAmount: report.summary.metadata.emdAmount,
    clauses: report.summary.eligibilityAndClauses ?? '',
    delayCompensation: report.summary.metadata.delayCompensation,
    invitingOffice: report.summary.metadata.invitingOffice,
    hasRoad: kind === 'works' && /\broad\b/i.test(`${report.summary.technicalScope} ${report.summary.executiveSummary}`),
    keyTerms: report.summary.metadata.keyTerms,
    sourceText: report.summary.sourceText,
    // Codes found anywhere in the tender at analysis time; older reports only have the excerpt and summaries.
    isCodes: new Set([
      ...(report.summary.metadata.standards?.isCodes ?? []),
      ...isCodesIn([report.summary.sourceText, report.summary.technicalScope, report.summary.eligibilityAndClauses].join('\n')),
    ]),
    nitRef,
    tenderTitle,
    kind,
    pan: company.panNumber,
    gstin: company.gstin,
  };
  const context = buildContext(report, company);
  const sourceExcerpt = report.summary.sourceText ? `\n\nTENDER TEXT (selected extracts):\n${report.summary.sourceText}` : '';
  const sections: BidSection[] = [];
  // Sequential: a local Ollama serves one generation at a time.
  const tenderText = [report.summary.sourceText, report.summary.technicalScope, report.summary.eligibilityAndClauses].join('\n');
  for (const section of bidOrder(kind, report.summary.metadata.worksType)) {
    if ('render' in section) {
      const { render, ...meta } = section;
      sections.push({ ...meta, content: render({ nitRef, tenderTitle, company, kind }) });
      continue;
    }
    const { id, title, cover, brief, needsSource, maxTokens, finish } = section;
    const meta = { id, title, cover };
    const fitted = fitBriefToTender(brief, tenderText).replace(
      '{methodItems}',
      methodologyItems(`${tenderTitle}\n${tenderText}`, report.summary.metadata.worksType, tenderTitle)
    );
    const task = `Write the "${section.title}" section of the bid for ${company.legalName}. ${fitted.replace(
      '{completionMonths}',
      String(months ?? 'N (the completion period in the tender)')
    )}`;
    // The task goes before and after the long context: Llama 3 drifts when it only comes last.
    const userPrompt = `${task}\n\n${keyFigures}\n\n${context}${needsSource ? sourceExcerpt : ''}\n\nREMINDER: ${task}`;

    let content = '';
    let problem: string | undefined;
    for (const temperature of [0.3, 0.1]) {
      const response = await generateWithLlm({
        model,
        systemPrompt: systemPrompt(kind),
        userPrompt,
        inferenceOptions: { temperature, max_tokens: maxTokens ?? 900 },
      });
      content = tidyDraft(response.content);
      if (section.clean) content = section.clean(content);
      problem = findDraftProblem(section, content, facts);
      if (!problem) break;
      console.warn(`[bid] ${id} draft rejected at temperature ${temperature}: ${problem}\n${content}`);
    }
    if (!problem) {
      content = redactUnknownStandards(content, facts.isCodes ?? new Set());
      content = redactUnknownGrades(content, new Set([...(report.summary.metadata.standards?.grades ?? []), ...gradesIn(tenderText)]));
    }
    sections.push({
      ...meta,
      source: 'model',
      content: problem ? EDIT_NEEDED(problem) : finish ? finish(content, facts) : content,
    });
  }

  return {
    tenderId,
    tenderTitle,
    generatedAt: new Date().toISOString(),
    modelUsed: health.modelName ?? model,
    sections,
  };
}
