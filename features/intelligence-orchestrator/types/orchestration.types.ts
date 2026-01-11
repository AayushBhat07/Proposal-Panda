/**
 * PHASE 4C: Intelligence Orchestration Types
 * 
 * Defines the unified output structure for the Phase 4A → Phase 4B pipeline
 * 
 * THIS IS COORDINATION, NOT INTELLIGENCE.
 * NO AI LOGIC IS ADDED HERE.
 */

import type { TenderSummary } from '../../summarization/types/summarization.types';
import type { ComplianceScore } from '../../compliance-scoring/types/compliance.types';

/**
 * Unified intelligence output
 * Combines Phase 4A and Phase 4B results with execution metadata
 */
export interface IntelligenceReport {
  /**
   * Phase 4A: Structured tender summary
   */
  summary: TenderSummary;

  /**
   * Phase 4B: Compliance and risk scoring
   */
  compliance: ComplianceScore;

  /**
   * Pipeline execution metadata
   */
  metadata: {
    /**
     * ISO timestamp when report was generated
     */
    generatedAt: string;

    /**
     * Pipeline version identifier
     */
    pipelineVersion: '4A+4B';

    /**
     * Total execution time in milliseconds
     */
    executionTimeMs: number;
  };
}

/**
 * Input for intelligence orchestration
 */
export interface IntelligenceOrchestrationInput {
  /**
   * Path to tender document (.docx)
   * Phase 4C NEVER reads this directly - it's passed to Phase 4A
   */
  tenderFilePath: string;

  /**
   * Tender metadata for processing
   */
  tenderId: string;
  tenderTitle: string;

  /**
   * Optional: verbose logging
   */
  verbose?: boolean;
}

/**
 * Orchestration result with diagnostics
 */
export interface IntelligenceOrchestrationResult {
  /**
   * Unified intelligence report
   */
  report: IntelligenceReport;

  /**
   * Diagnostics from the pipeline
   */
  diagnostics: {
    /**
     * Phase 4A execution time
     */
    phase4ATimeMs: number;

    /**
     * Phase 4B execution time
     */
    phase4BTimeMs: number;

    /**
     * Total pipeline execution time
     */
    totalTimeMs: number;

    /**
     * Phase execution order (for verification)
     */
    executionOrder: ['Phase 4A', 'Phase 4B'];

    /**
     * Any warnings during orchestration
     */
    warnings: string[];

    /**
     * Any errors during orchestration
     */
    errors: string[];
  };
}
