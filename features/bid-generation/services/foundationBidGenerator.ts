/**
 * Foundation bid generation (server-side).
 * Follows the Indian two-bid structure (CPWD / state PWD): Cover I technical bid with letter of transmittal,
 * document checklist, declarations, eligibility and bid capacity, scope, methodology, compliance and pre-bid
 * queries; Cover II price bid. Narrative sections come from the local Llama 3 model (AI_CONFIG.MODEL_NAME);
 * standard proformas come from bidTemplates.ts.
 */

import { AI_CONFIG } from '@/lib/config/constants';
import { checkLlmHealth, generateWithLlm } from '@/lib/llm/ollama';
import type { IntelligenceReport } from '@/features/intelligence-orchestrator/types/orchestration.types';
import type { CompanyProfile } from '@/types/onboarding.types';
import type { BidSection, FoundationBid } from '../types/bid.types';
import { TEMPLATE_SECTIONS } from './bidTemplates';

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
      emdAmount && !content.replace(/\s/g, '').includes(emdAmount.replace(/^Rs\.\s*/, ''))
        ? 'it does not state the EMD amount'
        : undefined,
    finish: (content, { nitRef, tenderTitle, invitingOffice }) =>
      [
        'To,',
        ...(invitingOffice
          ? `The ${invitingOffice}`.split(/,\s*/).map((part, i, all) => (i < all.length - 1 ? `${part},` : part))
          : ['The Executive Engineer,', '[Division and address as per NIT]']),
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
      'Construction methodology, one short paragraph per item, in this order, skipping only items the tender does ' +
      'not include: earthwork and foundations; RCC superstructure (concrete grade, steel grade); masonry; flooring ' +
      'and finishes; waterproofing; water supply; sanitary installations; electrical installations; roads; drainage; ' +
      'GRIHA / green-building measures. In each paragraph name only the specifications and standards the tender ' +
      'text gives for that item (quote them as written, e.g. MoRTH layers and carriageway width for roads, mix design ' +
      'standard and RMC for concrete), the sequence of work, and the physical or laboratory tests for that item. ' +
      'Never invent materials or methods the tender does not state, and never expand an abbreviation unless the ' +
      'tender text does. "Earthwork and foundations" means the building foundations, not the road. ' +
      'Then one paragraph on safety and one line ' +
      '"Key technical staff and plant: [to be listed]". Do not write a work programme. ' +
      'Do not repeat text between items and do not end with a note or disclaimer.',
    needsSource: true,
    maxTokens: 1600,
  },
  programme: {
    id: 'work-programme',
    title: 'Work Programme',
    cover: 'technical',
    brief:
      'A month-by-month work programme. Write exactly one line per month, from "Month 1:" to "Month {completionMonths}:", ' +
      'each followed by the activities in that month. Follow the build order: mobilisation, foundations, RCC frame ' +
      'floor by floor (about a third of the period for a multi-storey frame), masonry, services rough-in, ' +
      'waterproofing, flooring and finishes, services fixtures, then testing and handover. Schedule any external ' +
      'road and drainage works in their own months outside the monsoon (June to September), alongside the building ' +
      'work. Output only those lines.',
    check: (content, { months, hasRoad }) => {
      const plan = parseProgramme(content);
      if (plan.size < Math.ceil((months ?? 2) / 2)) return `it plans only ${plan.size} month(s)`;
      if (hasRoad && firstMonth(plan, /road|carriageway|pavement|bituminous/i) === undefined) {
        return 'it leaves out the road works';
      }
      let previous: [string, number] | undefined;
      for (const [trade, pattern] of BUILD_ORDER) {
        const start = firstMonth(plan, pattern);
        if (start === undefined) continue;
        if (previous && start < previous[1]) return `it starts ${trade} before ${previous[0]}`;
        previous = [trade, start];
      }
      return undefined;
    },
    finish: (content, { months }) => renderProgramme(content, months),
  },
  compliance: {
    id: 'compliance-statement',
    title: 'Compliance with Tender Conditions',
    cover: 'technical',
    brief:
      'A clause-by-clause compliance statement: for each submission, EMD, performance security, eligibility and ' +
      'legal requirement found in the analysis, one line stating how the bidder complies. Leave out compensation ' +
      'for delay, price variation, advances and security deposit: those are listed separately. ' +
      'Do not restate the bidder\'s GSTIN, PAN or any registration; write "[as per enclosed registration certificates]". ' +
      'For eligibility criteria (similar works, turnover, no-loss, solvency, bid capacity) never assert the bidder ' +
      'meets them: write "Supporting documents enclosed at [Annexure __]; to be confirmed from company records." ' +
      'Never mark a clause as not applicable. Never comment on the estimated cost, budget or price: the price is ' +
      'quoted only in Cover II. The department, not the bidder, deducts cess and recovers deposits. Address each flagged risk and submission trap factually. Do not comment on clauses the tender does not contain.',
    needsSource: true,
    check: (content, { clauses }) => {
      const wrong = [...content.matchAll(/Clause\s*(\d+[A-Z]*)\b[^\n]{0,80}?\bdoes not apply/gi)]
        .map(m => m[1])
        .find(c => !new RegExp(`\\b${c}\\b[^\\n]{0,80}?does not apply`, 'i').test(clauses));
      return wrong ? `it says Clause ${wrong} does not apply, which the tender analysis does not` : undefined;
    },
    finish: (content, { clauses, delayCompensation }) => {
      const lines = keyClauseLines(clauses, delayCompensation);
      return lines.length
        ? `${content}\n\nKey contract clauses (as stated in the tender; accepted):\n${lines.map(l => `- ${l}`).join('\n')}`
        : content;
    },
  },
  queries: {
    id: 'pre-bid-queries',
    title: 'Pre-bid Queries and Clarifications',
    cover: 'technical',
    brief:
      'Numbered pre-bid queries (1., 2., ...) the contractor should raise with the department, and nothing else. ' +
      'Never ask about anything the tender already states clearly (deadlines, EMD, forms, how security deposit is ' +
      'recovered). Do not repeat a query. Cite a clause number only if the analysis gives that number for the very term you ask about. Focus on ambiguous or ' +
      'onerous conditions: delay compensation and its cap, price variation / escalation, advances, third-party ' +
      'approvals or certification costs (e.g. GRIHA, RMC plant approval), site access and utilities. ' +
      'Never claim the tender lacks something; only ask about what is unclear. ' +
      'Keep each query to one or two sentences.',
    check: content => {
      if (!/^\s*1[.)]\s/m.test(content)) return 'it has no numbered queries';
      const claim = content.match(/absence of|\black(?:s|ing)? (?:a|any|clear)|not (?:clearly )?(?:mentioned|specified|provided|defined)|does not (?:include|contain|mention|specify|provide)/i);
      return claim ? `it says the tender lacks something ("${claim[0]}")` : undefined;
    },
  },
};

/** Statements a draft must never make: they are eligibility facts only company records can supply. */
const INVENTED_CLAIMS =
  /\b(?:our|the) (?:company|firm)\b[^.]{0,40}\b(?:has|have|had) (?:successfully )?(?:completed|executed)|\bturnover\b[^.]{0,80}\bwas (?:Rs|INR|₹)|\b(?:our|its) [^.]{0,30}\bturnover\b[^.]{0,60}\b(?:is|of) (?:Rs|INR|₹)|has not (?:incurred|suffered) (?:any )?loss|(?:have|has|possess) (?:the )?(?:necessary|requisite|adequate) (?:technical |financial )?(?:capabilit|capacit|experience)|we (?:meet|fulfil|fulfill|satisfy) (?:all )?(?:the )?eligibility|\bour (?:technical )?(?:capabilit\w*|experience|expertise|track record)\b|\bideal candidate\b|\bwell[- ]equipped\b|\b(?:has|have|holds?|possess(?:es)?) (?:a |the )?(?:valid )?[^.]{0,30}\b(?:EPF|ESI|ESIC|PF)\b|within the (?:specified |estimated )?(?:budget|estimated cost)|\bbid meets all (?:the )?requirements\b|good strength base|well manufactured macadam|chartered accountant[^.]{0,40}\b(?:concrete|test|cube|quality)|(?:concrete|test|cube|quality)[^.]{0,60}chartered accountant/i;

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
export function renderProgramme(draft: string, months: number | undefined): string {
  const byMonth = parseProgramme(draft);
  const last = months ?? Math.max(0, ...byMonth.keys());
  const lines = Array.from({ length: last }, (_, i) => `Month ${i + 1}: ${byMonth.get(i + 1) ?? '[activities to be planned]'}`);
  return [
    ...lines,
    '',
    'The defect liability period runs from the date of completion and is not part of this programme.',
  ].join('\n');
}

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

const SYSTEM_PROMPT =
  'You draft bid documents for an Indian civil-works contractor responding to a CPWD / state PWD tender ' +
  'under the two-bid system (Cover I technical, Cover II financial). ' +
  'Use only the facts in the tender analysis, tender text and company profile provided. ' +
  'Copy figures that appear there (EMD, estimated cost, periods, percentages, clause numbers) exactly. ' +
  'Only for facts that are absent, write a bracketed placeholder such as [insert value]; never invent figures, dates, ' +
  'certificates or past projects. Always refer to the bidder by its company name, never a placeholder. ' +
  'Never add commitments beyond the tender conditions, and never state acceptance of risks or of clauses the tender lacks. ' +
  'Never state that the bidder has any experience, completed works, turnover, profit, solvency or bid capacity ' +
  'unless it is in the company profile; a false eligibility declaration gets a bid rejected and the contractor debarred. ' +
  'Do not write dates; use [dd/mm/yyyy]. ' +
  'Write in formal English, ready for the contractor to edit. Output only the section body, without a heading.';

export class BidModelUnavailableError extends Error {}

function buildKeyFigures(report: IntelligenceReport, nitRef: string): string {
  const { metadata } = report.summary;
  return [
    'KEY FIGURES (copy exactly):',
    `- NIT reference: ${nitRef}`,
    `- Name of work: ${metadata.tenderTitle}`,
    `- Estimated cost: ${metadata.estimatedCost ?? '[insert value]'}`,
    `- EMD: ${metadata.emdAmount ?? '[insert value]'}`,
    `- Completion period: ${metadata.completionMonths ? `${metadata.completionMonths} months` : '[insert period]'}`,
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
  const tenderTitle = report.summary.metadata.tenderTitle;
  const months = report.summary.metadata.completionMonths;
  // The internal tenderId never goes into the bid; only the reference printed on the NIT does.
  const nitRef = report.summary.metadata.nitReference ?? '[NIT No.]';
  const keyFigures = buildKeyFigures(report, nitRef);
  const facts: DraftFacts = {
    months,
    emdAmount: report.summary.metadata.emdAmount,
    clauses: report.summary.eligibilityAndClauses ?? '',
    delayCompensation: report.summary.metadata.delayCompensation,
    invitingOffice: report.summary.metadata.invitingOffice,
    hasRoad: /\broad\b/i.test(`${report.summary.technicalScope} ${report.summary.executiveSummary}`),
    nitRef,
    tenderTitle,
    pan: company.panNumber,
    gstin: company.gstin,
  };
  const context = buildContext(report, company);
  const sourceExcerpt = report.summary.sourceText ? `\n\nTENDER TEXT (selected extracts):\n${report.summary.sourceText}` : '';
  const sections: BidSection[] = [];
  // Sequential: a local Ollama serves one generation at a time.
  for (const section of BID_ORDER) {
    if ('render' in section) {
      const { render, ...meta } = section;
      sections.push({ ...meta, content: render({ nitRef, tenderTitle, company }) });
      continue;
    }
    const { id, title, cover, brief, needsSource, maxTokens, finish } = section;
    const meta = { id, title, cover };
    const task = `Write the "${section.title}" section of the bid for ${company.legalName}. ${brief.replace(
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
        systemPrompt: SYSTEM_PROMPT,
        userPrompt,
        inferenceOptions: { temperature, max_tokens: maxTokens ?? 900 },
      });
      content = tidyDraft(response.content);
      problem = findDraftProblem(section, content, facts);
      if (!problem) break;
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
