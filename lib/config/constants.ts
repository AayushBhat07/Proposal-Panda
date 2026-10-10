/**
 * Application constants
 */

export const APP_NAME = 'Tender Automation Platform';
export const APP_VERSION = '1.0.0-prototype';

/**
 * localStorage keys prefix
 */
export const STORAGE_PREFIX = 'tender-app-';

/**
 * Mock delay constants (in milliseconds)
 */
export const DELAYS = {
  AUTH: 800,
  QUICK: 200,
  NORMAL: 500,
  AI_GENERATION: 3000,
  AI_SCORING: 1500,
  AI_SUMMARIZATION: 2000,
} as const;

/**
 * Tender status values
 */
export const TENDER_STATUSES = {
  DRAFT: 'Draft',
  IN_REVIEW: 'InReview',
  SUBMITTED: 'Submitted',
  ACCEPTED: 'Accepted',
  FLAGGED: 'Flagged',
  REJECTED: 'Rejected',
} as const;

/**
 * Local model configuration (Ollama). Server-side only; override with env vars, see .env.example.
 * - MODEL_NAME: long-form generation (tender chapters, foundation bids)
 * - ANALYSIS_MODEL: tender summarisation during analysis
 */
export const AI_CONFIG = {
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  MODEL_NAME: process.env.OLLAMA_BID_MODEL || 'llama3:latest',
  ANALYSIS_MODEL: process.env.OLLAMA_ANALYSIS_MODEL || 'qwen2.5:3b-instruct',
  CONTEXT_TOKENS: Number(process.env.OLLAMA_NUM_CTX) || 8192,
  TIMEOUT_MS: Number(process.env.OLLAMA_TIMEOUT_MS) || 120000, // local CPU inference is slow
  MAX_RETRIES: 1,
  DEFAULT_INFERENCE: {
    temperature: 0.2,
    top_p: 0.9,
    repeat_penalty: 1.1,
    max_tokens: 2048,
  },
} as const;
