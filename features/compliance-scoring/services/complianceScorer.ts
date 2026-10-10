/**
 * PHASE 4B: Compliance Scoring Orchestrator
 * 
 * Consumes Phase 4A structured summaries and performs:
 * - Factual compliance checks
 * - Risk identification
 * - Structured, explainable scoring
 * 
 * THIS IS ANALYSIS, NOT GENERATION.
 * THIS IS FACTS, NOT ADVICE.
 */

import type {
  ComplianceScoringInput,
  ComplianceAnalysisResult,
  ComplianceScore,
  IdentifiedRisk,
  MissingClause,
  RiskLevel,
} from '../types/compliance.types';

/**
 * Analyze tender summary for compliance and risk
 * 
 * @param input - Phase 4A summary (READ-ONLY)
 * @returns Structured compliance score with diagnostics
 */
export async function analyzeCompliance(
  input: ComplianceScoringInput
): Promise<ComplianceAnalysisResult> {
  const startTime = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // Validate input
    validateInput(input);

    // Deterministic rules over the Qwen-generated summary; no model call here.
    const verbose = input.options?.verbose || false;
    if (verbose) console.log('[ComplianceScorer] Starting rule-based analysis...');

    // Perform deterministic compliance analysis
    const complianceScore = await performComplianceAnalysis(
      input,
      verbose
    );

    // Validate output structure
    validateComplianceScore(complianceScore);

    // Check for forbidden language
    const languageViolations = detectForbiddenLanguage(complianceScore);
    if (languageViolations.length > 0) {
      errors.push(`Forbidden language detected: ${languageViolations.join(', ')}`);
      throw new Error('Language validation failed');
    }

    const processingTimeMs = Date.now() - startTime;

    return {
      score: complianceScore,
      diagnostics: {
        processingTimeMs,
        modelUsed: 'rules',
        tenderId: input.summary.metadata.tenderId,
        summaryVersion: 'Phase 4A',
        warnings,
        errors,
      },
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error');
    throw new Error(`Compliance analysis failed: ${errors.join('; ')}`);
  }
}

type RuleResult = { risks: IdentifiedRisk[]; scorePenalty: number; level: RiskLevel };
type Summary = ComplianceScoringInput['summary'];

function levelFor(penalty: number, medium: number, high: number): RiskLevel {
  return penalty >= high ? 'High' : penalty >= medium ? 'Medium' : 'Low';
}

/** Clauses quoted from the tender text, by label. Empty for reports analysed before quoting existed. */
function clausesOf(summary: Summary): Record<string, string> {
  return Object.fromEntries((summary.metadata.riskClauses ?? []).map((c) => [c.label, c.text]));
}

/** A risk that quotes the tender sentence it comes from. */
function quotedRisk(category: IdentifiedRisk['category'], quote: string, consequence: string): IdentifiedRisk {
  return { category, description: `The tender states: "${quote}" ${consequence}`, sourceSection: 'tender text' };
}

/**
 * Deterministic analysis. Every rule reads the tender's own sentences or figures (summary.metadata), never the
 * model's prose, so a risk is only raised when the tender says it, and the same tender always scores the same.
 */
async function performComplianceAnalysis(
  input: ComplianceScoringInput,
  verbose: boolean
): Promise<ComplianceScore> {
  const { summary } = input;
  const clauses = clausesOf(summary);

  const financialRisks = analyzeFinancialRisks(clauses);
  const technicalRisks = analyzeTechnicalRisks(summary.metadata.completionMonths);
  const legalRisks = analyzeLegalRisks(clauses);
  const submissionRisks = analyzeSubmissionRisks(clauses);
  const contractRisks = analyzeContractTerms(summary);
  const results = { financialRisks, technicalRisks, legalRisks, submissionRisks, contractRisks };

  if (verbose) {
    for (const [name, r] of Object.entries(results)) {
      console.log(`[Compliance] ${name}: ${r.risks.length} risks, penalty ${r.scorePenalty}, ${r.level}`);
    }
  }

  const identifiedRisks: IdentifiedRisk[] = [
    ...contractRisks.risks,
    ...financialRisks.risks,
    ...technicalRisks.risks,
    ...legalRisks.risks,
    ...submissionRisks.risks,
  ];

  const conservativeBias = input.options?.conservativeBias === true;
  const penalty = Object.values(results).reduce((sum, r) => sum + r.scorePenalty, 0) + (conservativeBias ? 5 : 0);
  const complianceScore = Math.max(0, Math.min(100, 80 - penalty));

  const riskCategories = {
    financial: higherRisk(financialRisks.level, contractRisks.level),
    technical: technicalRisks.level,
    legal: legalRisks.level,
    submission: submissionRisks.level,
  };

  return {
    complianceScore,
    riskLevel: calculateOverallRiskLevel(riskCategories),
    riskCategories,
    identifiedRisks,
    missingOrWeakClauses: identifyMissingClauses(summary),
    submissionTraps: identifySubmissionTraps(clauses),
    confidenceNotes: generateConfidenceNotes(complianceScore, identifiedRisks.length, conservativeBias),
  };
}

/** Guarantees that can be encashed without consent, and deposits that can be forfeited. An EMD alone is not a risk. */
function analyzeFinancialRisks(clauses: Record<string, string>): RuleResult {
  const risks: IdentifiedRisk[] = [];
  let scorePenalty = 0;
  if (clauses['Unconditional guarantee']) {
    risks.push(quotedRisk('Financial', clauses['Unconditional guarantee'], 'The guarantee can be encashed without the contractor\'s consent.'));
    scorePenalty += 10;
  }
  if (clauses['Forfeiture']) {
    risks.push(quotedRisk('Financial', clauses['Forfeiture'], 'The deposit or guarantee named here can be forfeited.'));
    scorePenalty += 5;
  }
  return { risks, scorePenalty, level: levelFor(scorePenalty, 8, 15) };
}

/** A completion period of two years or more ties up plant, staff and guarantees for that long. */
function analyzeTechnicalRisks(completionMonths: number | undefined): RuleResult {
  if (completionMonths === undefined || completionMonths < 24) return { risks: [], scorePenalty: 0, level: 'Low' };
  return {
    risks: [{
      category: 'Technical',
      description: `The tender specifies a completion period of ${completionMonths} months. Resources and guarantees stay committed for that period.`,
      sourceSection: 'tender text',
    }],
    scorePenalty: 5,
    level: 'Medium',
  };
}

function analyzeLegalRisks(clauses: Record<string, string>): RuleResult {
  const risks: IdentifiedRisk[] = [];
  let scorePenalty = 0;
  if (clauses['Final and binding']) {
    risks.push(quotedRisk('Legal', clauses['Final and binding'], 'Decisions covered by this clause bind the contractor.'));
    scorePenalty += 5;
  }
  if (clauses['Indemnity']) {
    risks.push(quotedRisk('Legal', clauses['Indemnity'], 'The contractor carries the liabilities named here.'));
    scorePenalty += 5;
  }
  const disputes = clauses['Dispute resolution'];
  if (disputes && /arbitrat/i.test(disputes) && /\b(?:no|not|excluded)\b/i.test(disputes)) {
    risks.push(quotedRisk('Legal', disputes, 'Arbitration may not be available for disputes.'));
    scorePenalty += 10;
  }
  return { risks, scorePenalty, level: levelFor(scorePenalty, 8, 15) };
}

/** Online submission is normal; a deadline of a few days after an event is not. */
function analyzeSubmissionRisks(clauses: Record<string, string>): RuleResult {
  if (!clauses['Short notice']) return { risks: [], scorePenalty: 0, level: 'Low' };
  return {
    risks: [quotedRisk('Submission', clauses['Short notice'], 'The contractor has only this long to respond.')],
    scorePenalty: 8,
    level: 'Medium',
  };
}

const RISK_ORDER: RiskLevel[] = ['Low', 'Medium', 'High'];

function higherRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RISK_ORDER[Math.max(RISK_ORDER.indexOf(a), RISK_ORDER.indexOf(b))];
}

/**
 * Overall risk level from the category levels, so the headline never contradicts its own breakdown.
 * The numeric score only summarises penalties and does not set the level.
 */
export function calculateOverallRiskLevel(categories: Record<string, RiskLevel>): RiskLevel {
  const levels = Object.values(categories);
  const high = levels.filter((r) => r === 'High').length;
  const medium = levels.filter((r) => r === 'Medium').length;
  if (high >= 2) return 'High';
  if (high === 1 || medium >= 2) return 'Medium';
  return 'Low';
}

/**
 * Risks from the contract terms quoted word for word from the tender (summary.metadata.keyTerms),
 * so they don't depend on how the summary was worded.
 */
export function analyzeContractTerms(
  summary: ComplianceScoringInput['summary']
): { risks: IdentifiedRisk[]; scorePenalty: number; level: RiskLevel } {
  const terms = Object.fromEntries((summary.metadata.keyTerms ?? []).map((t) => [t.label, t.text]));
  const months = summary.metadata.completionMonths;
  const risks: IdentifiedRisk[] = [];
  let scorePenalty = 0;

  const priceVariation = terms['Price variation (Clause 10CC)'];
  if (priceVariation && /\bnot\b[^.]{0,30}\bappl/i.test(priceVariation)) {
    const long = months !== undefined && months >= 12;
    risks.push({
      category: 'Financial',
      description:
        `The tender states: "${priceVariation}" The quoted rates must absorb any increase in material and labour ` +
        `costs${months ? ` over the ${months}-month completion period` : ''}.`,
      sourceSection: 'tender text',
    });
    scorePenalty += long ? 10 : 5;
  }

  const delay = terms['Compensation for delay (Clause 2)'];
  if (delay) {
    risks.push({
      category: 'Financial',
      description: `The tender states: "${delay}"`,
      sourceSection: 'tender text',
    });
    scorePenalty += 5;
  }

  const advance = terms['Mobilisation advance'];
  if (advance && /bank guarantee|\bBG\b/i.test(advance)) {
    risks.push({
      category: 'Financial',
      description: `The tender states: "${advance}" Drawing the advance needs bank guarantee limits.`,
      sourceSection: 'tender text',
    });
  }

  const level: RiskLevel = scorePenalty >= 15 ? 'High' : scorePenalty >= 5 ? 'Medium' : 'Low';
  return { risks, scorePenalty, level };
}

const EXPECTED_CLAUSES: Array<{ label: string; clause: string }> = [
  { label: 'Dispute resolution', clause: 'Dispute Resolution Mechanism' },
  { label: 'Extension of time', clause: 'Time Extension Provisions' },
  { label: 'Force majeure', clause: 'Force Majeure Clause' },
];

/** Clauses absent from the tender text itself. Skipped for reports analysed before the text was checked. */
function identifyMissingClauses(summary: Summary): MissingClause[] {
  if (!summary.metadata.riskClauses) return [];
  const clauses = clausesOf(summary);
  return EXPECTED_CLAUSES.filter(({ label }) => !clauses[label]).map(({ clause }) => ({
    clause,
    reason: 'Not found in the tender text. Check whether the General Conditions of Contract it refers to (e.g. CPWD GCC) cover it.',
  }));
}

/** Procedural requirements quoted from the tender. */
function identifySubmissionTraps(clauses: Record<string, string>): string[] {
  const traps: string[] = [];
  if (clauses['Short notice']) traps.push(`Short deadline: "${clauses['Short notice']}"`);
  if (clauses['Unconditional guarantee']) traps.push(`Unconditional guarantee required: "${clauses['Unconditional guarantee']}"`);
  if (clauses['Online submission']) traps.push(`Online submission: "${clauses['Online submission']}"`);
  return traps;
}

/**
 * Generate confidence notes explaining scoring rationale
 */
function generateConfidenceNotes(
  score: number,
  riskCount: number,
  conservativeBias: boolean
): string {
  let notes = `Compliance score of ${score}/100 based on factual analysis of ${riskCount} identified risk factors. `;

  if (conservativeBias) {
    notes += 'Conservative bias applied (government tenders favor issuing authority). ';
  }

  if (score >= 75) {
    notes += 'The tender presents manageable compliance requirements.';
  } else if (score >= 60) {
    notes += 'The tender contains notable compliance requirements requiring careful attention.';
  } else {
    notes += 'The tender contains significant compliance requirements and restrictions.';
  }

  return notes;
}

/**
 * Validate input structure
 */
function validateInput(input: ComplianceScoringInput): void {
  if (!input.summary) {
    throw new Error('Missing Phase 4A summary input');
  }

  const required = [
    'executiveSummary',
    'commercialTerms',
    'datesAndObligations',
    'technicalScope',
    'legalHighlights',
    'attentionPoints',
  ];

  for (const field of required) {
    if (!(field in input.summary)) {
      throw new Error(`Missing required summary field: ${field}`);
    }
  }

  if (!input.summary.metadata?.tenderId) {
    throw new Error('Missing tender ID in summary metadata');
  }
}

/**
 * Validate compliance score output structure
 */
function validateComplianceScore(score: ComplianceScore): void {
  if (typeof score.complianceScore !== 'number') {
    throw new Error('Invalid compliance score type');
  }

  if (score.complianceScore < 0 || score.complianceScore > 100) {
    throw new Error('Compliance score out of range (0-100)');
  }

  const validRiskLevels = ['Low', 'Medium', 'High'];
  if (!validRiskLevels.includes(score.riskLevel)) {
    throw new Error('Invalid risk level');
  }

  if (!score.riskCategories) {
    throw new Error('Missing risk categories');
  }
}

/**
 * Detect forbidden language in output
 */
function detectForbiddenLanguage(score: ComplianceScore): string[] {
  const violations: string[] = [];

  const forbiddenWords = [
    'should',
    'recommended',
    'better to',
    'unfair',
    'biased',
    'bad tender',
    'good idea',
    'bad idea',
  ];

  // Check all text fields
  const allText = [
    score.confidenceNotes,
    ...score.identifiedRisks.map((r) => r.description),
    ...score.missingOrWeakClauses.map((c) => c.reason),
    ...score.submissionTraps,
  ]
    .join(' ')
    // Quoted tender text is the tender's wording, not ours ("the bidder should submit...").
    .replace(/"[^"]*"/g, '')
    .toLowerCase();

  for (const word of forbiddenWords) {
    if (allText.includes(word)) {
      violations.push(word);
    }
  }

  return violations;
}
