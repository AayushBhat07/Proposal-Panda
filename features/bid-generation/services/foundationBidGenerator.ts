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

type ModelSection = Omit<BidSection, 'content' | 'source'> & { brief: string };

const MODEL_SECTIONS: Record<string, ModelSection> = {
  transmittal: {
    id: 'letter-of-transmittal',
    title: 'Letter of Transmittal',
    cover: 'technical',
    brief:
      'A formal letter of transmittal to the Executive Engineer / tender inviting authority, in the CPWD style: ' +
      'reference the NIT and work name, list the documents enclosed in Cover I (EMD, registration, financial ' +
      'information, similar works, affidavits), confirm the financial bid is submitted separately in Cover II, and ' +
      'confirm acceptance of all tender conditions. Do not mention any quoted price.',
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
      'Construction methodology for each major item of work (as per CPWD/MoRTH specifications named in the tender), ' +
      'sequencing, quality assurance and testing, safety, and a month-wise work programme (bar-chart style list) ' +
      'that fits the completion period. Mention deployment of key technical staff and plant as [to be listed].',
  },
  compliance: {
    id: 'compliance-statement',
    title: 'Compliance with Tender Conditions',
    cover: 'technical',
    brief:
      'A clause-by-clause compliance statement: for each submission, EMD / performance security, eligibility and ' +
      'legal requirement found in the analysis, one line stating how the bidder complies. Address each flagged risk ' +
      'and submission trap explicitly.',
  },
  queries: {
    id: 'pre-bid-queries',
    title: 'Pre-bid Queries and Clarifications',
    cover: 'technical',
    brief:
      'Numbered pre-bid queries the contractor should raise with the department about ambiguous, missing or ' +
      'onerous conditions in the analysis. Keep each query to one or two sentences.',
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
  'Use only the facts in the tender analysis and company profile provided. ' +
  'Never invent figures, dates, certificates or past projects: write a bracketed placeholder such as [insert value] instead. ' +
  'Write in formal English, ready for the contractor to edit. Output only the section body, without a heading.';

export class BidModelUnavailableError extends Error {}

function buildContext(report: IntelligenceReport, company: CompanyProfile): string {
  const { summary, compliance } = report;
  return [
    `TENDER: ${summary.metadata.tenderTitle} (${summary.metadata.tenderId})`,
    `Executive summary: ${summary.executiveSummary}`,
    `Commercial terms: ${summary.commercialTerms}`,
    `Dates and obligations: ${summary.datesAndObligations}`,
    `Technical scope: ${summary.technicalScope}`,
    `Legal highlights: ${summary.legalHighlights}`,
    `Attention points: ${summary.attentionPoints}`,
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

  const context = buildContext(report, company);
  const tenderId = report.summary.metadata.tenderId;
  const tenderTitle = report.summary.metadata.tenderTitle;
  const sections: BidSection[] = [];
  // Sequential: a local Ollama serves one generation at a time.
  for (const section of BID_ORDER) {
    if ('render' in section) {
      const { render, ...meta } = section;
      sections.push({ ...meta, content: render({ tenderId, tenderTitle, company }) });
      continue;
    }
    const { brief, ...meta } = section;
    const response = await generateWithLlm({
      model,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: `${context}\n\nWrite the "${section.title}" section of the bid. ${brief}`,
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
