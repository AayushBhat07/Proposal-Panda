/**
 * AI Generation Feature Exports
 * 
 * Public API for local LLM integration
 */

// Type exports
export type {
  InferenceOptions,
  LlmGenerationRequest,
  LlmGenerationResponse,
  LlmError,
  LlmErrorType,
  LlmHealthCheck,
  TenderSectionType,
  SectionPromptTemplate,
} from './types/aiGeneration.types';

// Service exports
export {
  generateWithLlm,
  generateWithLlmSafe,
  checkLlmHealth,
  LlmServiceError,
} from './services/localLlmService';

export {
  GLOBAL_SYSTEM_PROMPT,
  SECTION_PROMPT_TEMPLATES,
  getSystemPromptForSection,
  getInstructionTemplateForSection,
  buildSectionPrompt,
} from './services/generationInstruction';

// Internal test utilities (for development only)
export {
  runInternalGenerationTest,
  quickHealthCheck,
  getDiagnosticSummary,
} from './services/testGeneration';

export type { TestGenerationResult } from './services/testGeneration';
