/**
 * PHASE 4A: Tender Summarization Types
 * Defines structured output for tender summarization
 */

/**
 * Structured summarization output
 * All sections are factual compressions, no judgment or scoring
 */
export interface TenderSummary {
  /**
   * High-level project overview
   * - Scope of work
   * - Authority & location
   * - Contract value & duration
   */
  executiveSummary: string;

  /**
   * Key commercial terms
   * - EMD amount
   * - Performance security
   * - Completion period
   * - Defect liability period
   * - Tender type
   */
  commercialTerms: string;

  /**
   * Important dates and obligations
   * - Submission requirements
   * - Validity requirements
   * - Extension obligations (if mentioned)
   */
  datesAndObligations: string;

  /**
   * Technical scope overview
   * - Nature of works
   * - Major work categories (earthwork, concrete, drainage, etc.)
   * - Execution complexity (descriptive, not scored)
   */
  technicalScope: string;

  /**
   * Legal and contractual highlights
   * - Bond requirements
   * - Guarantee obligations
   * - Authority hierarchy
   * - Jurisdiction references
   */
  legalHighlights: string;

  /**
   * Risks and attention points (FACTUAL ONLY)
   * - Long execution period
   * - High security requirements
   * - Extensive technical scope
   * - Any repeated obligations
   * NOTE: This is NOT a risk assessment, only factual summary
   */
  attentionPoints: string;

  /**
   * Eligibility criteria and key contract clauses
   * - Similar works, turnover, solvency, bid capacity
   * - Delay compensation and cap, price variation, advances
   * - Dispute resolution
   */
  eligibilityAndClauses?: string;

  /** Start of the extracted tender text, so bid drafting can cite exact terms. */
  sourceText?: string;

  /**
   * Metadata
   */
  metadata: {
    tenderId: string;
    tenderTitle: string;
    generatedAt: Date;
    /** NIT / tender reference number found in the document, if any */
    nitReference?: string;
    /** Completion period in months found in the document, if any */
    completionMonths?: number;
    /** EMD as printed, e.g. "Rs. 27,24,900", if found */
    emdAmount?: string;
    /** Estimated cost put to tender as printed, if found */
    estimatedCost?: string;
    /** Compensation for delay, e.g. "1.5% per month, maximum 10%", if found */
    delayCompensation?: string;
    /** Tender inviting office, e.g. "Executive Engineer, Pune Central Division-II, ...", if found */
    invitingOffice?: string;
    /** Delay, price variation, advance, security deposit and guarantee terms quoted from the tender text */
    keyTerms?: Array<{ label: string; text: string }>;
    /**
     * Ollama model tag; "<model> (+N extractive)" when N sections fell back;
     * 'extractive-fallback' when no local model was reachable
     */
    modelUsed: string;
    totalChunks: number;
    processingTimeMs: number;
  };
}

/**
 * Tender document input for summarization
 */
export interface TenderDocumentInput {
  /**
   * Full tender text (can be plain text or extracted from .docx)
   */
  fullText: string;

  /**
   * Optional: Chapter-wise content for better summarization
   */
  chapters?: {
    chapterId: string;
    title: string;
    content: string;
  }[];

  /**
   * Tender metadata
   */
  tenderId: string;
  tenderTitle: string;
}

/**
 * Text chunk for summarization
 */
export interface TextChunk {
  index: number;
  text: string;
  tokenCount: number;
  source: string; // e.g., "Chapter 01", "Full Text"
}

/**
 * Summarization options
 */
export interface SummarizationOptions {
  /**
   * Ollama model tag (default: AI_CONFIG.ANALYSIS_MODEL)
   */
  model?: string;

  /**
   * Maximum tokens per chunk (default: 1024)
   */
  maxTokensPerChunk?: number;

  /**
   * Overlap tokens between chunks (default: 100)
   */
  overlapTokens?: number;

  /**
   * Maximum length for each summary section (default: 500)
   */
  maxSummaryLength?: number;

  /**
   * Enable verbose logging
   */
  verbose?: boolean;
}

/**
 * Summarization result with diagnostics
 */
export interface SummarizationResult {
  summary: TenderSummary;
  diagnostics: {
    inputLength: number;
    chunksProcessed: number;
    averageChunkLength: number;
    totalTokensProcessed: number;
    processingTimeMs: number;
    errors: string[];
    warnings: string[];
  };
}
