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
 * User roles
 */
export const USER_ROLES = {
  ADMIN: 'Admin',
  BID_WRITER: 'BidWriter',
  REVIEWER: 'Reviewer',
  EXECUTIVE: 'Executive',
  EXTERNAL_CONSULTANT: 'ExternalConsultant',
} as const;

/**
 * AI Generation Configuration
 * Local LLM settings for Ollama integration
 */
export const AI_CONFIG = {
  OLLAMA_BASE_URL: 'http://localhost:11434',
  MODEL_NAME: 'llama3:latest',
  TIMEOUT_MS: 40000, // 40 seconds
  MAX_RETRIES: 1,
  DEFAULT_INFERENCE: {
    temperature: 0.2,
    top_p: 0.9,
    repeat_penalty: 1.1,
    max_tokens: 2048,
  },
} as const;
