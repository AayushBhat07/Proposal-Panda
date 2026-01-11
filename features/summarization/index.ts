/**
 * PHASE 4A: Tender Summarization Feature
 * BART-based post-generation summarization
 * 
 * SCOPE:
 * - Extract text from generated tenders
 * - Chunk and process with BART
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
