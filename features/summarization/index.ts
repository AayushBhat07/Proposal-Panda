/**
 * PHASE 4A: Tender Summarization Feature
 * Tender summarization with the local Qwen model
 * 
 * SCOPE:
 * - Extract text from generated tenders
 * - Chunk and summarise with Qwen via Ollama
 * - Generate 6-section structured summary
 * - Export to JSON, Markdown, and text formats
 * 
 * NON-SCOPE:
 * - No UI components
 * - No scoring or judgment
 * - No modification of tender content
 * - Backend-only feature
 */

export * from './types';
export * from './services';
