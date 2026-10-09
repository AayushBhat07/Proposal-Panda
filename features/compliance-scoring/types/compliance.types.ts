/**
 * PHASE 4B: Compliance & Risk Scoring Types
 * Defines structured output for compliance analysis and risk identification
 * 
 * This is ANALYSIS, not generation.
 * This is FACTS, not advice.
 */

/**
 * Risk level classification
 */
export type RiskLevel = 'Low' | 'Medium' | 'High';

/**
 * Risk categories for classification
 */
export type RiskCategory = 'Financial' | 'Technical' | 'Legal' | 'Submission';

/**
 * Identified risk with source traceability
 */
export interface IdentifiedRisk {
  /**
   * Risk category
   */
  category: RiskCategory;

  /**
   * Factual description of the risk
   * ALLOWED: "The tender specifies...", "The document states..."
   * FORBIDDEN: "should", "recommended", "unfair", "bad tender"
   */
  description: string;

  /**
   * Source section from Phase 4A summary
   * e.g., "executiveSummary", "legalHighlights", "commercialTerms"
   */
  sourceSection: string;
}

/**
 * Missing or weak clause identification
 */
export interface MissingClause {
  /**
   * Name or description of the clause
   */
  clause: string;

  /**
   * Factual reason for concern (no opinion)
   */
  reason: string;
}

/**
 * Structured compliance scoring output
 * EXACT structure required - do not modify
 */
export interface ComplianceScore {
  /**
   * Overall compliance score (0-100)
   * Higher = more compliant/less risky
   * Same input → same output (deterministic)
   */
  complianceScore: number;

  /**
   * Overall risk level based on aggregate analysis
   */
  riskLevel: RiskLevel;

  /**
   * Risk breakdown by category
   */
  riskCategories: {
    financial: RiskLevel;
    technical: RiskLevel;
    legal: RiskLevel;
    submission: RiskLevel;
  };

  /**
   * Identified risks with factual descriptions
   */
  identifiedRisks: IdentifiedRisk[];

  /**
   * Missing or weak clauses that increase risk
   */
  missingOrWeakClauses: MissingClause[];

  /**
   * Submission traps (factual observations)
   * e.g., "Requires unconditional bank guarantee within 3 days"
   */
  submissionTraps: string[];

  /**
   * Model confidence and analysis notes
   * Explains scoring rationale
   */
  confidenceNotes: string;
}

/**
 * Compliance analysis options
 */
export interface ComplianceAnalysisOptions {
  /**
   * Take 5 more points off every score (government tenders favor authority)
   * Default: false
   */
  conservativeBias?: boolean;

  /**
   * Enable verbose logging
   */
  verbose?: boolean;
}

/**
 * Compliance analysis result with diagnostics
 */
export interface ComplianceAnalysisResult {
  /**
   * Structured compliance score
   */
  score: ComplianceScore;

  /**
   * Diagnostics and metadata
   */
  diagnostics: {
    /**
     * Analysis processing time (ms)
     */
    processingTimeMs: number;

    /**
     * Model used for analysis
     */
    modelUsed: string;

    /**
     * Tender ID analyzed
     */
    tenderId: string;

    /**
     * Phase 4A summary version consumed
     */
    summaryVersion: string;

    /**
     * Any warnings during analysis
     */
    warnings: string[];

    /**
     * Any errors during analysis
     */
    errors: string[];
  };
}

/**
 * Input for compliance scoring
 * Consumes Phase 4A output ONLY
 */
export interface ComplianceScoringInput {
  /**
   * Phase 4A structured summary (READ-ONLY)
   */
  summary: {
    executiveSummary: string;
    commercialTerms: string;
    datesAndObligations: string;
    technicalScope: string;
    legalHighlights: string;
    attentionPoints: string;
    metadata: {
      tenderId: string;
      tenderTitle: string;
      generatedAt: Date;
      modelUsed: string;
      totalChunks: number;
      processingTimeMs: number;
      completionMonths?: number;
      /** Key contract terms quoted word for word from the tender text */
      keyTerms?: Array<{ label: string; text: string }>;
      /** Risk-bearing clauses quoted from the tender text */
      riskClauses?: Array<{ label: string; text: string }>;
    };
  };

  /**
   * Analysis options
   */
  options?: ComplianceAnalysisOptions;
}
