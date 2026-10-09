/**
 * PHASE 4A: Tender Summarization Types
 * Defines structured output for BART-based post-generation summarization
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
   * Metadata
   */
  metadata: {
    tenderId: string;
    tenderTitle: string;
    generatedAt: Date;
    /** Ollama model tag, or 'extractive-fallback' when no local model was reachable */
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
 * Text chunk for processing with BART
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
   * Model to use (default: BART-large-cnn)
   */
  model?: string;

  /**
   * Maximum tokens per chunk (default: 1024 for BART)
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
