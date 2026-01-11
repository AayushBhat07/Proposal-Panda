/**
 * PHASE 4C: Intelligence Orchestration Service
 * 
 * Coordinates Phase 4A (Summarization) → Phase 4B (Compliance Scoring)
 * 
 * STRICT RULES:
 * - NO AI logic added
 * - NO direct document reading (Phase 4A does that)
 * - NO data transformation (pass through only)
 * - NO scoring logic (Phase 4B does that)
 * - ONLY coordination and aggregation
 */

import type {
  IntelligenceOrchestrationInput,
  IntelligenceOrchestrationResult,
  IntelligenceReport,
} from '../types/orchestration.types';

// Import Phase 4A
import { summarizeTenderFromFile } from '../../summarization/services/summarizationOrchestrator';

// Import Phase 4B
import { analyzeCompliance } from '../../compliance-scoring/services/complianceScorer';
import type { ComplianceScoringInput } from '../../compliance-scoring/types/compliance.types';

/**
 * Execute full intelligence pipeline: Phase 4A → Phase 4B
 * 
 * @param input - Tender file path and metadata
 * @returns Unified intelligence report with diagnostics
 */
export async function executeIntelligencePipeline(
  input: IntelligenceOrchestrationInput
): Promise<IntelligenceOrchestrationResult> {
  const pipelineStartTime = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    if (input.verbose) {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║          PHASE 4C: INTELLIGENCE ORCHESTRATION              ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
      console.log(`📄 Tender: ${input.tenderTitle}`);
      console.log(`🆔 ID: ${input.tenderId}`);
      console.log(`📂 File: ${input.tenderFilePath}\n`);
    }

    // ────────────────────────────────────────────────────────────
    // STEP 1: Execute Phase 4A (Summarization)
    // ────────────────────────────────────────────────────────────
    if (input.verbose) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔵 PHASE 4A: Tender Summarization');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    const phase4AStartTime = Date.now();
    
    const summarizationResult = await summarizeTenderFromFile(
      input.tenderFilePath,
      input.tenderId,
      input.tenderTitle,
      {
        verbose: input.verbose,
      }
    );

    const phase4AEndTime = Date.now();
    const phase4ATimeMs = phase4AEndTime - phase4AStartTime;

    if (input.verbose) {
      console.log(`\n✅ Phase 4A completed in ${phase4ATimeMs}ms\n`);
    }

    // Collect Phase 4A diagnostics
    if (summarizationResult.diagnostics.warnings.length > 0) {
      warnings.push(...summarizationResult.diagnostics.warnings.map(w => `[Phase 4A] ${w}`));
    }
    if (summarizationResult.diagnostics.errors.length > 0) {
      errors.push(...summarizationResult.diagnostics.errors.map(e => `[Phase 4A] ${e}`));
    }

    // ────────────────────────────────────────────────────────────
    // STEP 2: Execute Phase 4B (Compliance Scoring)
    // ────────────────────────────────────────────────────────────
    if (input.verbose) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🟢 PHASE 4B: Compliance & Risk Scoring');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    const phase4BStartTime = Date.now();

    // Prepare Phase 4B input (consumes Phase 4A output)
    const complianceInput: ComplianceScoringInput = {
      summary: summarizationResult.summary,
      options: {
        verbose: input.verbose,
      },
    };

    const complianceResult = await analyzeCompliance(complianceInput);

    const phase4BEndTime = Date.now();
    const phase4BTimeMs = phase4BEndTime - phase4BStartTime;

    if (input.verbose) {
      console.log(`\n✅ Phase 4B completed in ${phase4BTimeMs}ms\n`);
    }

    // Collect Phase 4B diagnostics
    if (complianceResult.diagnostics.warnings.length > 0) {
      warnings.push(...complianceResult.diagnostics.warnings.map(w => `[Phase 4B] ${w}`));
    }
    if (complianceResult.diagnostics.errors.length > 0) {
      errors.push(...complianceResult.diagnostics.errors.map(e => `[Phase 4B] ${e}`));
    }

    // ────────────────────────────────────────────────────────────
    // STEP 3: Aggregate Results
    // ────────────────────────────────────────────────────────────
    const pipelineEndTime = Date.now();
    const totalTimeMs = pipelineEndTime - pipelineStartTime;

    const report: IntelligenceReport = {
      summary: summarizationResult.summary,
      compliance: complianceResult.score,
      metadata: {
        generatedAt: new Date().toISOString(),
        pipelineVersion: '4A+4B',
        executionTimeMs: totalTimeMs,
      },
    };

    if (input.verbose) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ PIPELINE COMPLETE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(`📊 Phase 4A: ${phase4ATimeMs}ms`);
      console.log(`📊 Phase 4B: ${phase4BTimeMs}ms`);
      console.log(`📊 Total: ${totalTimeMs}ms`);
      console.log(`\n📈 Compliance Score: ${report.compliance.complianceScore}/100`);
      console.log(`⚠️  Risk Level: ${report.compliance.riskLevel}\n`);
    }

    return {
      report,
      diagnostics: {
        phase4ATimeMs,
        phase4BTimeMs,
        totalTimeMs,
        executionOrder: ['Phase 4A', 'Phase 4B'],
        warnings,
        errors,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`[Pipeline] ${errorMessage}`);

    throw new Error(
      `Intelligence pipeline failed: ${errorMessage}\n` +
      `Warnings: ${warnings.join('; ')}\n` +
      `Errors: ${errors.join('; ')}`
    );
  }
}

/**
 * Validate that Phase 4B never runs without Phase 4A
 * This is a safety check to enforce execution order
 */
export function validateExecutionOrder(
  phase4ACompleted: boolean,
  phase4BAttempted: boolean
): void {
  if (phase4BAttempted && !phase4ACompleted) {
    throw new Error(
      'EXECUTION ORDER VIOLATION: Phase 4B cannot run without Phase 4A. ' +
      'The intelligence pipeline requires Phase 4A (summarization) to complete before Phase 4B (compliance scoring).'
    );
  }
}

/**
 * Validate output schema matches specification
 */
export function validateReportSchema(report: IntelligenceReport): void {
  // Check required top-level keys
  if (!report.summary) {
    throw new Error('Invalid report: missing summary');
  }
  if (!report.compliance) {
    throw new Error('Invalid report: missing compliance');
  }
  if (!report.metadata) {
    throw new Error('Invalid report: missing metadata');
  }

  // Check metadata structure
  if (report.metadata.pipelineVersion !== '4A+4B') {
    throw new Error('Invalid report: incorrect pipelineVersion');
  }
  if (typeof report.metadata.executionTimeMs !== 'number') {
    throw new Error('Invalid report: executionTimeMs must be a number');
  }
  if (typeof report.metadata.generatedAt !== 'string') {
    throw new Error('Invalid report: generatedAt must be an ISO date string');
  }

  // Check compliance score structure
  if (typeof report.compliance.complianceScore !== 'number') {
    throw new Error('Invalid report: compliance.complianceScore must be a number');
  }
  if (!report.compliance.riskLevel) {
    throw new Error('Invalid report: missing compliance.riskLevel');
  }
}
