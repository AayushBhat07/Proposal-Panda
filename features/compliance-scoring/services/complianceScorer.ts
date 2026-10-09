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

/**
 * Perform deterministic compliance analysis
 * 
 * Uses rule-based extraction and pattern matching to ensure
 * same input → same output
 */
async function performComplianceAnalysis(
  input: ComplianceScoringInput,
  verbose: boolean
): Promise<ComplianceScore> {
  const { summary } = input;

  // Initialize baseline score
  let baselineScore = 80;

  // Analyze each section for risk indicators
  const financialRisks = analyzeFinancialRisks(summary, verbose);
  const technicalRisks = analyzeTechnicalRisks(summary, verbose);
  const legalRisks = analyzeLegalRisks(summary, verbose);
  const submissionRisks = analyzeSubmissionRisks(summary, verbose);

  // Aggregate identified risks
  const identifiedRisks: IdentifiedRisk[] = [
    ...financialRisks.risks,
    ...technicalRisks.risks,
    ...legalRisks.risks,
    ...submissionRisks.risks,
  ];

  // Calculate compliance score adjustments
  baselineScore -= financialRisks.scorePenalty;
  baselineScore -= technicalRisks.scorePenalty;
  baselineScore -= legalRisks.scorePenalty;
  baselineScore -= submissionRisks.scorePenalty;

  // Apply conservative bias for government tenders
  if (input.options?.conservativeBias !== false) {
    baselineScore -= 5; // Government tenders favor authority
  }

  // Clamp score to 0-100
  const complianceScore = Math.max(0, Math.min(100, baselineScore));

  // Determine risk categories
  const riskCategories = {
    financial: financialRisks.level,
    technical: technicalRisks.level,
    legal: legalRisks.level,
    submission: submissionRisks.level,
  };

  // Determine overall risk level
  const riskLevel = calculateOverallRiskLevel(complianceScore, riskCategories);

  // Identify missing or weak clauses
  const missingOrWeakClauses = identifyMissingClauses(summary);

  // Identify submission traps
  const submissionTraps = identifySubmissionTraps(summary);

  // Generate confidence notes
  const confidenceNotes = generateConfidenceNotes(
    complianceScore,
    identifiedRisks.length,
    input.options?.conservativeBias !== false
  );

  return {
    complianceScore,
    riskLevel,
    riskCategories,
    identifiedRisks,
    missingOrWeakClauses,
    submissionTraps,
    confidenceNotes,
  };
}

/**
 * Analyze financial risks from summary
 */
function analyzeFinancialRisks(
  summary: ComplianceScoringInput['summary'],
  verbose: boolean
): { risks: IdentifiedRisk[]; scorePenalty: number; level: RiskLevel } {
  const risks: IdentifiedRisk[] = [];
  let scorePenalty = 0;

  const commercialText = summary.commercialTerms.toLowerCase();
  const legalText = summary.legalHighlights.toLowerCase();

  // Check for high EMD
  if (commercialText.includes('emd') || commercialText.includes('earnest money')) {
    const emdMatch = commercialText.match(/rs\.?\s*([\d,]+)/i);
    if (emdMatch) {
      risks.push({
        category: 'Financial',
        description: `The tender specifies an Earnest Money Deposit (EMD) requirement. Contractors must arrange this financial guarantee before submission.`,
        sourceSection: 'commercialTerms',
      });
      scorePenalty += 5;
    }
  }

  // Check for unconditional guarantees
  if (
    legalText.includes('unconditional') &&
    (legalText.includes('guarantee') || legalText.includes('bond'))
  ) {
    risks.push({
      category: 'Financial',
      description: `The document requires unconditional bank guarantees. The contractor is obligated to provide guarantees without conditions or qualifications.`,
      sourceSection: 'legalHighlights',
    });
    scorePenalty += 10;
  }

  // Check for forfeiture clauses
  if (
    commercialText.includes('forfeiture') ||
    legalText.includes('forfeiture') ||
    commercialText.includes('penalty')
  ) {
    risks.push({
      category: 'Financial',
      description: `The tender contains forfeiture or penalty clauses. Financial guarantees may be forfeited under specified conditions.`,
      sourceSection: 'legalHighlights',
    });
    scorePenalty += 5;
  }

  // Check for performance security
  if (commercialText.includes('performance security') || commercialText.includes('security deposit')) {
    risks.push({
      category: 'Financial',
      description: `The tender requires performance security deposit. The contractor must provide additional financial security after contract award.`,
      sourceSection: 'commercialTerms',
    });
    scorePenalty += 3;
  }

  // Determine financial risk level
  let level: RiskLevel = 'Low';
  if (scorePenalty >= 15) {
    level = 'High';
  } else if (scorePenalty >= 8) {
    level = 'Medium';
  }

  if (verbose) {
    console.log(`[FinancialRisk] Identified ${risks.length} risks, penalty: ${scorePenalty}, level: ${level}`);
  }

  return { risks, scorePenalty, level };
}

/**
 * Analyze technical risks from summary
 */
function analyzeTechnicalRisks(
  summary: ComplianceScoringInput['summary'],
  verbose: boolean
): { risks: IdentifiedRisk[]; scorePenalty: number; level: RiskLevel } {
  const risks: IdentifiedRisk[] = [];
  let scorePenalty = 0;

  const technicalText = summary.technicalScope.toLowerCase();
  const executiveText = summary.executiveSummary.toLowerCase();

  // Check for long execution period
  if (
    technicalText.includes('23 months') ||
    technicalText.includes('24 months') ||
    executiveText.includes('23 months')
  ) {
    risks.push({
      category: 'Technical',
      description: `The tender specifies an execution period of 23 months. The contractor is required to maintain resources and performance standards over an extended duration.`,
      sourceSection: 'technicalScope',
    });
    scorePenalty += 5;
  }

  // Check for extensive scope
  if (
    technicalText.includes('extensive') ||
    technicalText.includes('complex') ||
    technicalText.includes('multiple')
  ) {
    risks.push({
      category: 'Technical',
      description: `The document describes extensive technical scope. The contractor must have capability to execute multiple work categories.`,
      sourceSection: 'technicalScope',
    });
    scorePenalty += 5;
  }

  // Check for specialized requirements
  if (
    technicalText.includes('specialized') ||
    technicalText.includes('specific') ||
    technicalText.includes('certified')
  ) {
    risks.push({
      category: 'Technical',
      description: `The tender requires specialized technical capabilities or certifications. The contractor must demonstrate specific qualifications.`,
      sourceSection: 'technicalScope',
    });
    scorePenalty += 3;
  }

  // Determine technical risk level
  let level: RiskLevel = 'Low';
  if (scorePenalty >= 10) {
    level = 'High';
  } else if (scorePenalty >= 5) {
    level = 'Medium';
  }

  if (verbose) {
    console.log(`[TechnicalRisk] Identified ${risks.length} risks, penalty: ${scorePenalty}, level: ${level}`);
  }

  return { risks, scorePenalty, level };
}

/**
 * Analyze legal risks from summary
 */
function analyzeLegalRisks(
  summary: ComplianceScoringInput['summary'],
  verbose: boolean
): { risks: IdentifiedRisk[]; scorePenalty: number; level: RiskLevel } {
  const risks: IdentifiedRisk[] = [];
  let scorePenalty = 0;

  const legalText = summary.legalHighlights.toLowerCase();

  // Check for finality clauses
  if (
    legalText.includes('finality') ||
    legalText.includes('final and binding') ||
    legalText.includes('irrevocable')
  ) {
    risks.push({
      category: 'Legal',
      description: `The document contains finality clauses. The contractor is bound by decisions stated as final and binding.`,
      sourceSection: 'legalHighlights',
    });
    scorePenalty += 10;
  }

  // Check for jurisdiction requirements
  if (legalText.includes('jurisdiction') || legalText.includes('arbitration')) {
    risks.push({
      category: 'Legal',
      description: `The tender specifies jurisdiction and arbitration requirements. Disputes must be resolved under stated legal framework.`,
      sourceSection: 'legalHighlights',
    });
    scorePenalty += 3;
  }

  // Check for indemnity clauses
  if (legalText.includes('indemnity') || legalText.includes('indemnify')) {
    risks.push({
      category: 'Legal',
      description: `The document requires the contractor to indemnify the authority. The contractor is obligated to protect the authority from specified liabilities.`,
      sourceSection: 'legalHighlights',
    });
    scorePenalty += 5;
  }

  // Check for guarantee obligations
  if (legalText.includes('guarantee') || legalText.includes('bond')) {
    risks.push({
      category: 'Legal',
      description: `The tender requires legal guarantees or bonds. The contractor must execute formal guarantee instruments.`,
      sourceSection: 'legalHighlights',
    });
    scorePenalty += 3;
  }

  // Determine legal risk level
  let level: RiskLevel = 'Low';
  if (scorePenalty >= 15) {
    level = 'High';
  } else if (scorePenalty >= 8) {
    level = 'Medium';
  }

  if (verbose) {
    console.log(`[LegalRisk] Identified ${risks.length} risks, penalty: ${scorePenalty}, level: ${level}`);
  }

  return { risks, scorePenalty, level };
}

/**
 * Analyze submission risks from summary
 */
function analyzeSubmissionRisks(
  summary: ComplianceScoringInput['summary'],
  verbose: boolean
): { risks: IdentifiedRisk[]; scorePenalty: number; level: RiskLevel } {
  const risks: IdentifiedRisk[] = [];
  let scorePenalty = 0;

  const datesText = summary.datesAndObligations.toLowerCase();
  const attentionText = summary.attentionPoints.toLowerCase();

  // Check for tight deadlines
  if (
    datesText.includes('3 days') ||
    datesText.includes('72 hours') ||
    datesText.includes('within 24')
  ) {
    risks.push({
      category: 'Submission',
      description: `The document specifies short submission timelines. The contractor must prepare and submit documents within limited timeframes.`,
      sourceSection: 'datesAndObligations',
    });
    scorePenalty += 8;
  }

  // Check for online submission requirements
  if (
    datesText.includes('online') ||
    datesText.includes('portal') ||
    datesText.includes('digital signature')
  ) {
    risks.push({
      category: 'Submission',
      description: `The tender requires online submission through designated portal. The contractor must comply with digital submission procedures.`,
      sourceSection: 'datesAndObligations',
    });
    scorePenalty += 2;
  }

  // Check for multiple document requirements
  if (
    attentionText.includes('extensive documentation') ||
    attentionText.includes('numerous requirements')
  ) {
    risks.push({
      category: 'Submission',
      description: `The tender requires extensive documentation. The contractor must prepare and submit multiple supporting documents.`,
      sourceSection: 'attentionPoints',
    });
    scorePenalty += 3;
  }

  // Determine submission risk level
  let level: RiskLevel = 'Low';
  if (scorePenalty >= 10) {
    level = 'High';
  } else if (scorePenalty >= 5) {
    level = 'Medium';
  }

  if (verbose) {
    console.log(`[SubmissionRisk] Identified ${risks.length} risks, penalty: ${scorePenalty}, level: ${level}`);
  }

  return { risks, scorePenalty, level };
}

/**
 * Calculate overall risk level based on score and categories
 */
function calculateOverallRiskLevel(
  score: number,
  categories: Record<string, RiskLevel>
): RiskLevel {
  // Count high/medium risk categories
  const highRiskCount = Object.values(categories).filter((r) => r === 'High').length;
  const mediumRiskCount = Object.values(categories).filter((r) => r === 'Medium').length;

  // Overall risk logic
  if (score < 60 || highRiskCount >= 2) {
    return 'High';
  } else if (score < 75 || highRiskCount >= 1 || mediumRiskCount >= 2) {
    return 'Medium';
  } else {
    return 'Low';
  }
}

/**
 * Identify missing or weak clauses
 */
function identifyMissingClauses(
  summary: ComplianceScoringInput['summary']
): MissingClause[] {
  const clauses: MissingClause[] = [];

  const legalText = summary.legalHighlights.toLowerCase();
  const commercialText = summary.commercialTerms.toLowerCase();

  // Check for dispute resolution
  if (!legalText.includes('dispute') && !legalText.includes('arbitration')) {
    clauses.push({
      clause: 'Dispute Resolution Mechanism',
      reason: 'The tender does not explicitly specify dispute resolution procedures.',
    });
  }

  // Check for extension provisions
  if (!commercialText.includes('extension') && !legalText.includes('extension')) {
    clauses.push({
      clause: 'Time Extension Provisions',
      reason: 'The document does not clearly state procedures for time extension requests.',
    });
  }

  // Check for force majeure
  if (!legalText.includes('force majeure') && !legalText.includes('unforeseen')) {
    clauses.push({
      clause: 'Force Majeure Clause',
      reason: 'Not found in the tender text summary. Check whether the General Conditions of Contract it refers to (e.g. CPWD GCC) cover it.',
    });
  }

  return clauses;
}

/**
 * Identify submission traps (procedural requirements)
 */
function identifySubmissionTraps(
  summary: ComplianceScoringInput['summary']
): string[] {
  const traps: string[] = [];

  const datesText = summary.datesAndObligations.toLowerCase();
  const legalText = summary.legalHighlights.toLowerCase();

  // Short notice requirements
  if (datesText.includes('3 days') || datesText.includes('72 hours')) {
    traps.push('Requires document submission within 3 days of specified events');
  }

  // Unconditional guarantees
  if (legalText.includes('unconditional') && legalText.includes('guarantee')) {
    traps.push('Requires unconditional bank guarantee without qualification');
  }

  // No extension clause
  if (!datesText.includes('extension')) {
    traps.push('No explicit provision for deadline extensions mentioned');
  }

  // Online portal requirement
  if (datesText.includes('online') || datesText.includes('portal')) {
    traps.push('Submission must be completed through designated online portal');
  }

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
  ].join(' ').toLowerCase();

  for (const word of forbiddenWords) {
    if (allText.includes(word)) {
      violations.push(word);
    }
  }

  return violations;
}
