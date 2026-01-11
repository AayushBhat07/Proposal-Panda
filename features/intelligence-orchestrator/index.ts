/**
 * PHASE 4C: Intelligence Orchestration Layer
 * Public API
 * 
 * PURPOSE:
 * Thin backend orchestration layer that coordinates Phase 4A and Phase 4B
 * 
 * SCOPE:
 * - Accept tender document (.docx)
 * - Run Phase 4A summarization
 * - Pass Phase 4A output to Phase 4B
 * - Return unified, structured result
 * 
 * NON-SCOPE:
 * - NO AI logic added
 * - NO scoring logic added
 * - NO document parsing (Phase 4A does that)
 * - NO UI components
 * - NO API routes
 * - NO export/formatting logic
 * 
 * This phase is COORDINATION ONLY.
 */

// Export types
export type {
  IntelligenceReport,
  IntelligenceOrchestrationInput,
  IntelligenceOrchestrationResult,
} from './types/orchestration.types';

// Export main orchestrator
export {
  executeIntelligencePipeline,
  validateExecutionOrder,
  validateReportSchema,
} from './services/intelligenceOrchestrator';
