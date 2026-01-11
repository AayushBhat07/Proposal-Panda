/**
 * Chapter Configuration
 * Defines the fixed 9-chapter structure with generation strategies
 */

import type { ChapterId, ChapterMetadata } from '../types/chapterGeneration.types';

/**
 * LOCKED CHAPTER STRUCTURE
 * Chapters 01-09 as defined in Phase 2B requirements
 */
export const CHAPTER_METADATA: Record<ChapterId, ChapterMetadata> = {
  '01': {
    id: '01',
    title: 'Tender Notice',
    strategy: 'TEMPLATE',
    requiresUserInput: true,
    description: 'Template-based tender notice with user inputs',
  },
  '02': {
    id: '02',
    title: 'Detailed Tender Notice',
    strategy: 'AI_GENERATE',
    requiresUserInput: false,
    description: 'AI-generated detailed notice (constrained)',
  },
  '03': {
    id: '03',
    title: 'Agreement Form B-1',
    strategy: 'TEMPLATE_FILL',
    requiresUserInput: true,
    description: 'Template fill only (NO free AI)',
  },
  '04': {
    id: '04',
    title: 'Additional General Conditions of Contract',
    strategy: 'AI_GENERATE',
    requiresUserInput: false,
    description: 'AI-generated GCC clauses (STRICT, clause-based)',
  },
  '05': {
    id: '05',
    title: 'General Notes Regarding Material & Schedule A',
    strategy: 'AI_GENERATE',
    requiresUserInput: false,
    description: 'AI-generated general notes',
  },
  '06': {
    id: '06',
    title: "Schedule 'B'",
    strategy: 'USER_UPLOAD_AI_NOTES',
    requiresUserInput: true,
    description: 'User upload + AI notes (pending user input if no upload)',
  },
  '07': {
    id: '07',
    title: 'Additional Specifications',
    strategy: 'AI_GENERATE',
    requiresUserInput: false,
    description: 'AI-generated specs (IS / MoRTH / CPWD aware)',
  },
  '08': {
    id: '08',
    title: 'Proforma of Bonds & Circulars',
    strategy: 'TEMPLATE_FILL',
    requiresUserInput: true,
    description: 'Template fill + user upload',
  },
  '09': {
    id: '09',
    title: 'Drawings',
    strategy: 'USER_UPLOAD',
    requiresUserInput: true,
    description: 'User upload only',
  },
};

/**
 * Get ordered list of chapter IDs
 */
export const CHAPTER_ORDER: ChapterId[] = ['01', '02', '03', '04', '05', '06', '07', '08', '09'];

/**
 * Get chapter metadata by ID
 */
export function getChapterMetadata(chapterId: ChapterId): ChapterMetadata {
  return CHAPTER_METADATA[chapterId];
}

/**
 * Get all chapters
 */
export function getAllChapters(): ChapterMetadata[] {
  return CHAPTER_ORDER.map(id => CHAPTER_METADATA[id]);
}

/**
 * Check if chapter requires AI generation
 */
export function requiresAiGeneration(chapterId: ChapterId): boolean {
  const strategy = CHAPTER_METADATA[chapterId].strategy;
  return strategy === 'AI_GENERATE' || strategy === 'USER_UPLOAD_AI_NOTES';
}
