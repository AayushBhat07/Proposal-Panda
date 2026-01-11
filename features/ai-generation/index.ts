/**
 * AI Generation Feature Exports
 * 
 * Public API for local LLM integration and chapter generation
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

export type {
  ChapterId,
  ChapterGenerationStrategy,
  ChapterStatus,
  ChapterMetadata,
  ChapterState,
  TenderInputForm,
  GenerationMode,
  TenderGenerationState,
  ChapterGenerationResult,
} from './types/chapterGeneration.types';

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

export {
  generateChapter,
} from './services/chapterGenerator';

// Config exports
export {
  CHAPTER_METADATA,
  CHAPTER_ORDER,
  getChapterMetadata,
  getAllChapters,
  requiresAiGeneration,
} from './config/chapterConfig';

// Hook exports
export { useTenderGenerationOrchestrator } from './hooks/useTenderGenerationOrchestrator';

// Component exports
export { default as TenderGenerationInputForm } from './components/TenderGenerationInputForm';
export { default as GenerationModeSelector } from './components/GenerationModeSelector';
export { default as ChapterTOC } from './components/ChapterTOC';
export { default as AssembledTenderView } from './components/AssembledTenderView';

// Internal test utilities (for development only)
export {
  runInternalGenerationTest,
  quickHealthCheck,
  getDiagnosticSummary,
} from './services/testGeneration';

export type { TestGenerationResult } from './services/testGeneration';
