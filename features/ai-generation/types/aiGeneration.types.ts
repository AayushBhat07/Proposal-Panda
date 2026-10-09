/**
 * AI Generation Types
 * Contracts for local LLM integration
 */

/**
 * Inference parameters for LLM generation
 */
export interface InferenceOptions {
  temperature?: number;
  top_p?: number;
  repeat_penalty?: number;
  max_tokens?: number;
}

/**
 * Request to local LLM service
 */
export interface LlmGenerationRequest {
  systemPrompt: string;
  userPrompt: string;
  /** Ollama model tag; defaults to AI_CONFIG.MODEL_NAME */
  model?: string;
  inferenceOptions?: InferenceOptions;
}

/**
 * Response from local LLM service
 */
export interface LlmGenerationResponse {
  content: string;
  modelName: string;
  tokenCount?: number;
  responseTimeMs: number;
  finishReason?: string;
}

/**
 * Error types for LLM operations
 */
export type LlmErrorType = 
  | 'OLLAMA_UNAVAILABLE'
  | 'TIMEOUT'
  | 'INVALID_REQUEST'
  | 'GENERATION_FAILED'
  | 'NETWORK_ERROR';

/**
 * Structured error from LLM service
 */
export interface LlmError {
  type: LlmErrorType;
  message: string;
  originalError?: Error;
}

/**
 * Health check response
 */
export interface LlmHealthCheck {
  available: boolean;
  modelName?: string;
  version?: string;
  errorMessage?: string;
}

/**
 * Section types for prompt templates
 */
export type TenderSectionType =
  | 'TENDER_NOTICE'
  | 'DETAILED_TENDER_NOTICE'
  | 'ADDITIONAL_GCC'
  | 'GENERAL_NOTES'
  | 'ADDITIONAL_SPECIFICATIONS';

/**
 * Section prompt template (placeholder for future use)
 */
export interface SectionPromptTemplate {
  sectionType: TenderSectionType;
  systemContext: string;
  instructionTemplate: string;
}
