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

/** needsSource: also give the model the start of the raw tender text, for exact terms and specs. */
type ModelSection = Omit<BidSection, 'content' | 'source'> & { brief: string; needsSource?: boolean };

const MODEL_SECTIONS: Record<string, ModelSection> = {
  transmittal: {
    id: 'letter-of-transmittal',
    title: 'Letter of Transmittal',
    cover: 'technical',
    brief:
      'A formal letter of transmittal to the Executive Engineer / tender inviting authority, in the CPWD style: ' +
      'reference the NIT and work name, list the documents enclosed in Cover I (EMD, registration, financial ' +
      'information, similar works, affidavits), confirm the financial bid is submitted separately in Cover II, and ' +
      'confirm acceptance of all tender conditions. Quote the NIT reference exactly as given. Do not mention any quoted price.',
  },
  scope: {
    id: 'scope-understanding',
    title: 'Understanding of Scope of Work',
    cover: 'technical',
    brief: 'Restate the scope of work, location, completion period and key deliverables to show the tender was understood.',
  },
  methodology: {
    id: 'methodology',
    title: 'Methodology and Work Programme',
    cover: 'technical',
    brief:
      'Construction methodology for each major item of work, naming the specifications, grades and standards the ' +
      'tender text states (e.g. concrete grade, steel grade, MoRTH/CPWD specs), sequencing, quality assurance and ' +
      'testing, and safety. Cover every component of the scope (e.g. foundations, superstructure, masonry, finishes, ' +
      'services, roads, drainage) that the tender names. Then a work programme listing EVERY month from Month 1 to ' +
      'Month {completionMonths} (Month numbers, not calendar months), allowing for monsoon. The defect liability period ' +
      'starts after completion and is not part of the programme. ' +
      'Mention deployment of key technical staff and plant as [to be listed]. End without disclaimers.',
    needsSource: true,
  },
  compliance: {
    id: 'compliance-statement',
    title: 'Compliance with Tender Conditions',
    cover: 'technical',
    brief:
      'A clause-by-clause compliance statement: for each submission, EMD / performance security, eligibility and ' +
      'legal requirement found in the analysis, one line stating how the bidder complies. For eligibility criteria ' +
      '(similar works, turnover, no-loss, solvency, bid capacity) never assert the bidder meets them: write ' +
      '"Supporting documents enclosed at [Annexure __]; to be confirmed from company records." ' +
      'Address each flagged risk and submission trap factually. Do not comment on clauses the tender does not contain.',
    needsSource: true,
  },
  queries: {
    id: 'pre-bid-queries',
    title: 'Pre-bid Queries and Clarifications',
    cover: 'technical',
    brief:
      'Numbered pre-bid queries the contractor should raise with the department. Never ask about anything the ' +
      'tender already states clearly (deadlines, EMD, forms). Focus on ambiguous or onerous conditions: delay ' +
      'compensation and its cap, price variation / escalation, advances, how security deposit is recovered, ' +
      'third-party approvals or certification costs, site access and utilities. Cite the clause where possible. ' +
      'Keep each query to one or two sentences.',
    needsSource: true,
  },
};

/** Final order of the bid, mixing model-drafted sections and standard proformas. */
const BID_ORDER: Array<ModelSection | (typeof TEMPLATE_SECTIONS)[number]> = [
  MODEL_SECTIONS.transmittal,
  TEMPLATE_SECTIONS.find(t => t.id === 'document-checklist')!,
  TEMPLATE_SECTIONS.find(t => t.id === 'declarations')!,
  TEMPLATE_SECTIONS.find(t => t.id === 'bid-capacity')!,
  MODEL_SECTIONS.scope,
  MODEL_SECTIONS.methodology,
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

function buildContext(report: IntelligenceReport, company: CompanyProfile, nitRef: string): string {
  const { summary, compliance } = report;
  return [
    `BIDDER: ${company.legalName}`,
    `TENDER: ${summary.metadata.tenderTitle}`,
    `NIT reference: ${nitRef}`,
    `Completion period: ${summary.metadata.completionMonths ? `${summary.metadata.completionMonths} months` : 'see tender text'}`,
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
  // The internal tenderId never goes into the bid; only the reference printed on the NIT does.
  const nitRef = report.summary.metadata.nitReference ?? '[NIT No.]';
  const context = buildContext(report, company, nitRef);
  const sourceExcerpt = report.summary.sourceText
    ? `\n\nTENDER TEXT (start of document):\n${report.summary.sourceText}`
    : '';
  const sections: BidSection[] = [];
  // Sequential: a local Ollama serves one generation at a time.
  for (const section of BID_ORDER) {
    if ('render' in section) {
      const { render, ...meta } = section;
      sections.push({ ...meta, content: render({ nitRef, tenderTitle, company }) });
      continue;
    }
    const { brief, needsSource, ...meta } = section;
    const response = await generateWithLlm({
      model,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: `${context}${needsSource ? sourceExcerpt : ''}\n\nWrite the "${section.title}" section of the bid. ${brief.replace(
        '{completionMonths}',
        String(report.summary.metadata.completionMonths ?? 'N (the completion period in the tender)')
      )}`,
      inferenceOptions: { temperature: 0.3, max_tokens: 900 },
    });
    sections.push({ ...meta, source: 'model', content: response.content });
  }

  return {
    tenderId,
    tenderTitle,
    generatedAt: new Date().toISOString(),
    modelUsed: health.modelName ?? model,
    sections,
  };
}
