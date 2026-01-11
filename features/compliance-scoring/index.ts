/**
 * PHASE 4B: Compliance & Risk Scoring Engine
 * Public API
 */

// Export types
export type {
  RiskLevel,
  RiskCategory,
  IdentifiedRisk,
  MissingClause,
  ComplianceScore,
  ComplianceAnalysisOptions,
  ComplianceAnalysisResult,
  ComplianceScoringInput,
} from './types/compliance.types';

// Export main service
export { analyzeCompliance } from './services/complianceScorer';

// Export utilities
export {
  validateInstructionModel,
  getRecommendedModel,
} from './services/instructionModelService';
