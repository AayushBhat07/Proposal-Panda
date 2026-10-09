/**
 * Foundation bid generation (server-side).
 * Drafts each bid section with the local generation model (AI_CONFIG.MODEL_NAME) through Ollama,
 * using the tender analysis and the contractor's company profile as the only sources.
 */

import { AI_CONFIG } from '@/lib/config/constants';
import { checkLlmHealth, generateWithLlm } from '@/features/ai-generation/services/localLlmService';
import type { IntelligenceReport } from '@/features/intelligence-orchestrator/types/orchestration.types';
import type { CompanyProfile } from '@/types/onboarding.types';
import type { BidSection, FoundationBid } from '../types/bid.types';

const SECTIONS: Array<{ id: string; title: string; brief: string }> = [
  {
    id: 'cover-letter',
    title: 'Covering Letter',
    brief: 'A formal covering letter from the contractor to the tendering authority submitting this bid.',
  },
  {
    id: 'scope-understanding',
    title: 'Understanding of Scope',
    brief: 'Restate the scope of work, location and key deliverables to show the contractor understood the tender.',
  },
  {
    id: 'technical-approach',
    title: 'Technical Approach and Methodology',
    brief: 'How the works will be executed: sequencing, methods for each major work category, quality control and safety.',
  },
  {
    id: 'work-plan',
    title: 'Work Plan and Schedule',
    brief: 'Phase-wise work plan that fits the completion period in the tender, as a list of phases with durations.',
  },
  {
    id: 'compliance-statement',
    title: 'Compliance Statement',
    brief:
      'A checklist of each submission, financial (EMD, performance security) and legal requirement in the tender, ' +
      'with a line stating how the contractor will comply. Address the flagged risks and submission traps.',
  },
  {
    id: 'commercial-notes',
    title: 'Commercial Notes and Assumptions',
    brief:
      'Commercial assumptions, exclusions and clarifications to raise with the authority. ' +
      'Do not quote any rates or totals; leave pricing as [to be priced from BOQ].',
  },
];

const SYSTEM_PROMPT =
  'You draft bid documents for an Indian civil-works contractor responding to a government tender. ' +
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
  const sections: BidSection[] = [];
  // Sequential: a local Ollama serves one generation at a time.
  for (const section of SECTIONS) {
    const response = await generateWithLlm({
      model,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: `${context}\n\nWrite the "${section.title}" section of the bid. ${section.brief}`,
      inferenceOptions: { temperature: 0.3, max_tokens: 900 },
    });
    sections.push({ id: section.id, title: section.title, content: response.content });
  }

  return {
    tenderId: report.summary.metadata.tenderId,
    tenderTitle: report.summary.metadata.tenderTitle,
    generatedAt: new Date().toISOString(),
    modelUsed: health.modelName ?? model,
    sections,
  };
}
